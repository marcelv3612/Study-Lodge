/*==============================================================*/
/* DBMS name:      PostgreSQL 7.3                               */
/* Created on:     20.01.2024 21:36:03                          */
/*==============================================================*/

drop view nej_rank_dle_balicku;

drop index ODPOVED_FK;

drop index ODPOVED_PK;

drop table ODPOVED;

drop index OBSAHUJE_FK;

drop index OTAZKA_PK;

drop table OTAZKA;

drop index MA_FK;

drop index RANKING_PK;

drop index RANK_FK;

drop table RANKING;

drop index BALICEK_OTAZEK_PK;

drop index PATRI_K_FK;

drop table BALICEK_OTAZEK;

drop index PREDMET_PK;

drop index UZIVATEL_PK;

drop table PREDMET;

drop table UZIVATEL;

/*==============================================================*/
/* Table: BALICEK_OTAZEK                                        */
/*==============================================================*/
create table BALICEK_OTAZEK (
ID_BALICKU           SERIAL               not null,
ID_PREDMETU          INT2                 not null,
constraint PK_BALICEK_OTAZEK primary key (ID_BALICKU)
);

/*==============================================================*/
/* Index: BALICEK_OTAZEK_PK                                     */
/*==============================================================*/
create unique index BALICEK_OTAZEK_PK on BALICEK_OTAZEK (
ID_BALICKU
);

/*==============================================================*/
/* Index: PATRI_K_FK                                            */
/*==============================================================*/
create  index PATRI_K_FK on BALICEK_OTAZEK (
ID_PREDMETU
);

/*==============================================================*/
/* Table: ODPOVED                                              */
/*==============================================================*/
create table ODPOVED (
ID_ODPOVED           SERIAL               not null,
ID_OTAZKA            INT2                 not null,
ZNENI                TEXT                 not null,
OZNACENI_ODPOVED     VARCHAR(1)           not null,
constraint PK_ODPOVED primary key (ID_ODPOVED)
);

/*==============================================================*/
/* Index: ODPOVED_PK                                           */
/*==============================================================*/
create unique index ODPOVED_PK on ODPOVED (
ID_ODPOVED
);

/*==============================================================*/
/* Index: ODPOVED_FK                                            */
/*==============================================================*/
create  index ODPOVED_FK on ODPOVED (
ID_OTAZKA
);

/*==============================================================*/
/* Table: OTAZKA                                                */
/*==============================================================*/
create table OTAZKA (
ID_OTAZKA            SERIAL               not null,
ID_BALICKU           INT2                 null,
ZNENI                TEXT                 not null,
SPRAVNA_ODPOVED      VARCHAR(1)           not null,
constraint PK_OTAZKA primary key (ID_OTAZKA)
);

/*==============================================================*/
/* Index: OTAZKA_PK                                             */
/*==============================================================*/
create unique index OTAZKA_PK on OTAZKA (
ID_OTAZKA
);

/*==============================================================*/
/* Index: OBSAHUJE_FK                                           */
/*==============================================================*/
create  index OBSAHUJE_FK on OTAZKA (
ID_BALICKU
);

/*==============================================================*/
/* Table: PREDMET                                               */
/*==============================================================*/
create table PREDMET (
ID_PREDMETU          SERIAL               not null,
NAZEV                VARCHAR(32)          not null,
KOD_PREDMETU         VARCHAR(10)          not null,
constraint PK_PREDMET primary key (ID_PREDMETU),
constraint AK_KOD_PREDMETU_PREDMET unique (KOD_PREDMETU)
);

/*==============================================================*/
/* Index: PREDMET_PK                                            */
/*==============================================================*/
create unique index PREDMET_PK on PREDMET (
ID_PREDMETU
);

/*==============================================================*/
/* Table: RANKING                                               */
/*==============================================================*/
create table RANKING (
RANK_ID              SERIAL               not null,
ID_BALICKU           INT2                 null,
ID_UZIVATELE         INT2                 null,
RANK                 INT4                 not null,
constraint PK_RANKING primary key (RANK_ID)
);

/*==============================================================*/
/* Index: RANKING_PK                                            */
/*==============================================================*/
create unique index RANKING_PK on RANKING (
RANK_ID
);

/*==============================================================*/
/* Index: RANK_FK                                               */
/*==============================================================*/
create  index RANK_FK on RANKING (
ID_BALICKU
);

/*==============================================================*/
/* Index: MA_FK                                                 */
/*==============================================================*/
create  index MA_FK on RANKING (
ID_UZIVATELE
);

/*==============================================================*/
/* Table: UZIVATEL                                              */
/*==============================================================*/
create table UZIVATEL (
ID_UZIVATELE         SERIAL               not null,
DISCORD_ID           VARCHAR(32)          not null,
constraint PK_UZIVATEL primary key (ID_UZIVATELE)
);

/*==============================================================*/
/* Index: UZIVATEL_PK                                           */
/*==============================================================*/
create unique index UZIVATEL_PK on UZIVATEL (
ID_UZIVATELE
);

alter table BALICEK_OTAZEK
   add constraint FK_BALICEK__PATRI_K_PREDMET foreign key (ID_PREDMETU)
      references PREDMET (ID_PREDMETU)
      on delete cascade on update cascade;

alter table ODPOVED
   add constraint FK_ODPOVED_ODPOVED_OTAZKA foreign key (ID_OTAZKA)
      references OTAZKA (ID_OTAZKA)
      on delete cascade on update cascade;

alter table OTAZKA
   add constraint FK_OTAZKA_OBSAHUJE_BALICEK_ foreign key (ID_BALICKU)
      references BALICEK_OTAZEK (ID_BALICKU)
      on delete cascade on update cascade;

alter table RANKING
   add constraint FK_RANKING_MA_UZIVATEL foreign key (ID_UZIVATELE)
      references UZIVATEL (ID_UZIVATELE)
      on delete cascade on update cascade;

alter table RANKING
   add constraint FK_RANKING_RANK_BALICEK_ foreign key (ID_BALICKU)
      references BALICEK_OTAZEK (ID_BALICKU)
      on delete cascade on update cascade;


CREATE VIEW nej_rank_dle_balicku AS
SELECT
  b.ID_BALICKU,
  p.NAZEV AS NAZEV_PREDMETU,
  p.KOD_PREDMETU,
  r.ID_UZIVATELE,
  u.DISCORD_ID,
  r.RANK
FROM
  BALICEK_OTAZEK b
JOIN
  RANKING r ON b.ID_BALICKU = r.ID_BALICKU
JOIN
  PREDMET p ON b.ID_PREDMETU = p.ID_PREDMETU
JOIN
  UZIVATEL u ON r.ID_UZIVATELE = u.ID_UZIVATELE
JOIN
  (
    SELECT
      ID_BALICKU,
      MAX(RANK) AS MaxRank
    FROM
      RANKING
    GROUP BY
      ID_BALICKU
  ) maxRanks ON r.ID_BALICKU = maxRanks.ID_BALICKU AND r.RANK = maxRanks.MaxRank;
 