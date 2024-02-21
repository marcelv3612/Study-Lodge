const e = require("express");
const pool = require("../db");
const { get } = require("./routes");

const getSets = (req, res) => {
  pool.query(
    "SELECT id_balicku, predmet.nazev, predmet.kod_predmetu FROM balicek_otazek join predmet using(id_predmetu) ORDER BY predmet.nazev",
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results.rows);
    }
  );
};

const getSetById = (req, res) => {
  const id = parseInt(req.params.id);

  pool.query(
    "SELECT * FROM otazka WHERE otazka.id_balicku = $1",
    [id],
    (error, results) => {
      if (error) throw error;

      const questionPromises = results.rows.map((question) => {
        return new Promise((resolve, reject) => {
          pool.query(
            "SELECT * FROM odpoved WHERE odpoved.id_otazka = $1",
            [question.id_otazka],
            (error, results) => {
              if (error) reject(error);

              const options = {};

              results.rows.forEach((option) => {
                options[option.oznaceni_odpoved] = option.zneni;
              });

              resolve({
                question: question.zneni,
                right_answer: question.spravna_odpoved,
                options: options,
              });
            }
          );
        });
      });

      Promise.all(questionPromises)
        .then((questions) => {
          res.status(200).json(questions);
        })
        .catch((error) => {
          throw error;
        });
    }
  );
};
//
const gameEnd = async (req, res) => {
  const userid = req.body?.userid;
  const setid = req.body?.setid;
  const score = req.body?.score;
  let userDbId = null;

  try {
    const user = await pool.query(
      "SELECT * FROM uzivatel WHERE discord_id = $1",
      [userid]
    );

    if (user.rows.length <= 0) {
      const newUser = await pool.query(
        "INSERT INTO uzivatel (discord_id) VALUES ($1) returning id_uzivatele",
        [userid]
      );

      userDbId = newUser.rows[0].id_uzivatele;
    } else {
      userDbId = user.rows[0].id_uzivatele;
    }

    const ranking = await pool.query(
      "SELECT * FROM ranking WHERE id_uzivatele = $1 AND id_balicku = $2",
      [userDbId, setid]
    );

    if (ranking.rows.length > 0) {
      if (ranking.rows[0].rank <= score) {
        await pool.query(
          "UPDATE ranking SET rank = $1 WHERE id_uzivatele = $2 AND id_balicku = $3",
          [score, userDbId, setid]
        );
      }
    }

    if (ranking.rows.length <= 0) {
      await pool.query(
        "INSERT INTO ranking (id_uzivatele, id_balicku, rank) VALUES ($1, $2, $3)",
        [userDbId, setid, score]
      );
    }

    res.status(200).json({ message: "OK" });
  } catch (error) {
    throw error;
  }
};

const getCourses = (req, res) => {
  pool.query("SELECT * FROM predmet", (error, results) => {
    if (error) {
      throw error;
    }
    res.status(200).json(results.rows);
  });
};

const addSet = async (req, res) => {
  const courseCode = req.body?.subject;
  const courseName = req.body?.name;
  const questions = req.body?.questions;

  try {
    if (!courseCode || !courseName || !questions) {
      throw new Error("Missing parameters");
    }

    let course = await pool.query(
      "SELECT * FROM predmet WHERE kod_predmetu = $1",
      [courseCode]
    );

    if (course.rows.length <= 0) {
      const courseId = await pool.query(
        "INSERT INTO predmet (nazev, kod_predmetu) VALUES ($1, $2) RETURNING id_predmetu",
        [courseName, courseCode]
      );

      course = await pool.query(
        "SELECT * FROM predmet WHERE kod_predmetu = $1",
        [courseCode]
      );
    }

    const idBalicku = await pool.query(
      "INSERT INTO balicek_otazek (id_predmetu) VALUES ((SELECT id_predmetu FROM predmet WHERE kod_predmetu = $1)) RETURNING id_balicku",
      [courseCode]
    );

    const idBalickuValue = idBalicku.rows[0].id_balicku;

    questions.forEach(async (question) => {
      await pool.query(
        "INSERT INTO otazka (id_balicku, zneni, spravna_odpoved) VALUES ($1, $2, $3) RETURNING id_otazka",
        [idBalickuValue, question.question, question.right_answer],
        (error, results) => {
          if (error) throw error;

          const questionId = results.rows[0].id_otazka;

          pool.query(
            "INSERT INTO odpoved (id_otazka, zneni, oznaceni_odpoved) VALUES ($1, $2, $3)",
            [questionId, question.options.A, "A"],
            (error, results) => {
              if (error) throw error;
            }
          );

          pool.query(
            "INSERT INTO odpoved (id_otazka, zneni, oznaceni_odpoved) VALUES ($1, $2, $3)",
            [questionId, question.options.B, "B"],
            (error, results) => {
              if (error) throw error;
            }
          );

          pool.query(
            "INSERT INTO odpoved (id_otazka, zneni, oznaceni_odpoved) VALUES ($1, $2, $3)",
            [questionId, question.options.C, "C"],
            (error, results) => {
              if (error) throw error;
            }
          );

          pool.query(
            "INSERT INTO odpoved (id_otazka, zneni, oznaceni_odpoved) VALUES ($1, $2, $3)",
            [questionId, question.options.D, "D"],
            (error, results) => {
              if (error) throw error;
            }
          );
        }
      );
    });

    res.status(201).send(`Set added with ID: ${idBalickuValue}`);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  /*
  pool.query(
    "SELECT * FROM predmet WHERE kod_predmetu = $1",
    [courseCode],
    (error, results) => {
      if (error) throw error;

      let course = "";

      if (results.rows.length == 0) {
        pool.query(
          "INSERT INTO predmet (nazev, kod_predmetu) VALUES ($1, $2)",
          [courseName, courseCode],
          (error, results) => {
            if (error) throw error;
          }
        );
      }

      pool.query(
        "SELECT * FROM predmet WHERE kod_predmetu = $1",
        [courseCode],
        (error, results) => {
          if (error) throw error;

          course = results.rows[0];
        }
      );

      pool.query(
        "INSERT INTO balicek_otazek (id_predmetu) VALUES ((SELECT id_predmetu FROM predmet WHERE kod_predmetu = $1)) RETURNING id_balicku",
        [courseCode],
        (error, results) => {
          if (error) throw error;

          let questionAddSQL = "";

          const idBalicku = results.rows[0].id_balicku;

          questions.forEach((question) => {
            questionAddSQL += `INSERT INTO otazky (id_balicku, text, spravna_odpoved) VALUES ($1, $2, $3);`;
            questionAddSQL += `INSERT INTO odpovedi (id_otazky, zneni_odpovedi) VALUES ($1, $4);`;
            questionAddSQL += `INSERT INTO odpovedi (id_otazky, zneni_odpovedi) VALUES ($1, $5);`;
            questionAddSQL += `INSERT INTO odpovedi (id_otazky, zneni_odpovedi) VALUES ($1, $6);`;
            questionAddSQL += `INSERT INTO odpovedi (id_otazky, zneni_odpovedi) VALUES ($1, $7);`;

            const values = [
              idBalicku,
              question.question,
              question.right_answer,
              question.options.A,
              question.options.B,
              question.options.C,
              question.options.D,
            ];

            if (error) throw error;

            pool.query(
              "INSERT INTO otazka (id_balicku, zneni, SPRAVNA_ODPOVED) VALUES ($1, $2, $3) RETURNING id_otazka",
              [idBalicku, question.question, question.right_answer],
              (error, results) => {
                if (error) throw error;

                const questionId = results.rows[0].id_otazka;

                pool.query(
                  "INSERT INTO odpoved (id_otazka, zneni, OZNACENI_ODPOVED) VALUES ($1, $2, $3)",
                  [questionId, question.options.A, "A"],
                  (error, results) => {
                    if (error) throw error;
                  }
                );

                pool.query(
                  "INSERT INTO odpoved (id_otazka, zneni, OZNACENI_ODPOVED) VALUES ($1, $2, $3)",
                  [questionId, question.options.B, "B"],
                  (error, results) => {
                    if (error) throw error;
                  }
                );

                pool.query(
                  "INSERT INTO odpoved (id_otazka, zneni, OZNACENI_ODPOVED) VALUES ($1, $2, $3)",
                  [questionId, question.options.C, "C"],
                  (error, results) => {
                    if (error) throw error;
                  }
                );

                pool.query(
                  "INSERT INTO odpoved (id_otazka, zneni, OZNACENI_ODPOVED) VALUES ($1, $2, $3)",
                  [questionId, question.options.D, "D"],
                  (error, results) => {
                    if (error) throw error;
                  }
                );
              }
            );
          });

          res.status(201).send(`Set added with ID: ${idBalicku}`);
        }
      );
    }
  );*/
};

const getRankingBySetId = (req, res) => {
  const setid = parseInt(req.params.id);

  pool.query(
    "SELECT rank,discord_id,nazev,kod_predmetu, id_balicku FROM ranking join balicek_otazek using(id_balicku) JOIN uzivatel on ranking.id_uzivatele = uzivatel.id_uzivatele JOIN predmet on balicek_otazek.id_predmetu = predmet.id_predmetu WHERE id_balicku = $1 ORDER BY rank DESC LIMIT 20",
    [setid],
    (error, results) => {
      if (error) throw error;

      res.status(200).json(results.rows);
    }
  );
};

const getRanking = (req, res) => {
  pool.query("SELECT * from nej_rank_dle_balicku", (error, results) => {
    if (error) throw error;

    res.status(200).json(results.rows);
  });
};

module.exports = {
  getSets,
  getCourses,
  addSet,
  getSetById,
  gameEnd,
  getRankingBySetId,
  getRanking,
};
