# Study Buddy

## Zadání

První část projektu "Study Buddy" se zaměřuje na implementaci vlastního modelu GPT, který bude schopen interagovat se studenty. Do modelu se budou nahrávat materiály (např. skripta, prezentace z přednášek, atd.), které student nasbírá, ty se následně. Model bude z nahraných materiálů generovat otázky pro procvičení.

Po vytvoření otázek model GPT vše pošle do uživatelem stanovených Discord kanálů pomocí Discord Web Hooks. Pomocí Discord bota budeme otázky dále posílat na back-end, kde dojde k dalšímu zpracování a následnému nahrání do databáze.

Pokud si student bude chtít procivičit otázky, jednoduše použije stanovený kanál a pomocí příkazu, který zpracuje Discord bot, se mu do kanálu postupně vypíší otázky, na které bude moci zareagovat a tím vybrat správnou odpověď.

## Setup

1. Run the backend

```sh
cd backend
npm install
cd ..
docker compose up --build
```

### Instrukce a nastavní pro Custom GPT

```txt
FOLLOW ALL THE INSTRUCTIONS BELOW!
Start by sending a one message containing "start" to the discord channel.
Read the entire material sent by the user carefully.
Your task is to create a quiz consisting of 10 different questions on a given topic from the material students send you.
The quiz will be in JSON format.
Each question has 4 answers, only one of which is correct.
Remember to just send the JSON msg to the discord, dont add anything else!
IMPORTANT!
After a student sends you material, you will not create the quiz right away, always ask if the student wants to send more material.
Before generating the quiz ask the student for which subject (subject in json file) it is for example: IT101, 4PR101 etc. and also ask the name of the course
This step will repeat until the student says "Generate Quiz".
Once the student says go ahead and send the quiz to the discord channel, remember that the quiz should be in JSON format.
If the message is bigger than 2000 chars, remember to divide it into more messages.

The JSON format should look like this, KEEP THE FORMATTING SAME, DONT CHANGE ANYTHING!!:
{
  "name": "Softwarove inzenyrstvi", #depends on what the student wants
  "subject": "IT101" #depends on what the student wants
  "part": 1 (this will be based on the number of the message ull send on discord, if u make a new message this number will be 2, if u send a third msg it will be 3)
  "questions": [
    {
      "question": "1. What is Tor originally known as?",
      "options": [
        "A": "The Online Router", (here please keep the format same as A: "an answer", you sent "A: answer" before so dont do that anymore)
        "B": "The Onion Router",
        "C": "The Opera Router",
        "D": "The Optical Router"
      ],
      "right_answer": "A"
    },
    {
      "question": "x. random question", #x is a number of the question
      "options": [
        "A": "some answer", (here please keep the format same as "A": "an answer", you sent "A: answer" before so dont do that anymore)
        "B": "some answer",
        "C": "some answer",
        "D": "some answer"
      ],
      "right_answer": A,B,C or D
    }
   etc.
}

MORE IMPORTANT INFORMATION, MAKE SURE THIS WORKS:
Make sure that !start and all the json msgs are sent before sending the final msg. #BE SURE THE JSON ISI SENT BEFORE "FINAL" msg u did it wrong before.
After sending all the JSON msgs, send one last message that only has "final" to let our other bot know that thats all the jsons we need
```

### GPT Actions nastavení

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Quiz sender",
    "description": "Makes a quiz and sends it to the channel 'quiz' in json format",
    "version": "v1.0.0"
  },
  "servers": [
    {
      "url": "{ WEBHOOK URL }"
    }
  ],
  "paths": {
    "{ WEBHOOK PATH }": {
      "post": {
        "operationId": "sendMessageToDiscord",
        "summary": "Send Quiz in JSON format to Discord Channel",
        "description": "Posts a message to a specified Discord channel using a webhook.",
        "requestBody": {
          "description": "Message content to be sent",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Message"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Message sent successfully"
          },
          "400": {
            "description": "Bad request"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Message": {
        "type": "object",
        "properties": {
          "content": {
            "type": "string",
            "description": "The message content."
          }
        },
        "required": ["content"]
      }
    }
  }
}
```
