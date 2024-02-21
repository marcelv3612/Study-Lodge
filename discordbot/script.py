#!/usr/bin/env python3

import discord
from discord.ext import commands
import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

channels = [1200052796637065287, 1200052894016217119] # game channels
quiz_channel = 1200052812013375639

to_send = {}
to_send_questions = []
active_games = []
loading = False


client = commands.Bot(command_prefix='!', intents=intents)

@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')

@client.event
async def on_message(message):
    global loading
    global to_send
    global to_send_questions
    if message.author == client.user:
        return
    if message.channel.id == quiz_channel:
        if message.content == "start" or message.content == "!start":
            loading = True
            to_send_questions = []
            to_send = {}
            return
        
        if message.content == "final" or message.content == "!final":
            loading = False
            to_send['questions'] = to_send_questions
            r = requests.post('http://localhost:3000/api/add-set', json=to_send)
            print(r)
            print(to_send)

            to_send_questions = []
            to_send = {}
        
        if loading == True:
            data = json.loads(message.content)
            
            to_send['name'] = data['name']
            to_send['subject'] = data['subject']
            question_list = data['questions']
        
            for question in question_list:
                to_send_questions.append(question)
            
    await client.process_commands(message)

@client.command()
async def game(ctx):
    active_channel = ctx.message.channel
    active_channel_id = ctx.message.channel.id

    if active_channel_id not in channels:
        return
    
    if is_game_channel_active(ctx):
        await active_channel.send('Hra už běží')
        return
    
    if is_player_in_game(ctx):
        await active_channel.send('Už jsi v jiné hře')
        return

    new_game = {}
    new_game['channel_id'] = active_channel_id
    new_game['player'] = ctx.message.author.id
    new_game['questions'] = []
    active_games.append(new_game)

    await active_channel.send('Začínám hru v kanálu ' + active_channel.name)
    sets = requests.get('http://localhost:3000/api/sets/').json()
    await active_channel.send("Vyberte balíček")

    msg = ""
    prev_course = ""
    for i in range(len(sets)):
        if sets[i]['nazev'] != prev_course:
            msg += f"Předmět {sets[i]['nazev']} ({sets[i]['kod_predmetu']}): \n"
            prev_course = sets[i]['nazev']

        msg += f"Balíček {sets[i]['id_balicku']}\n"

    await active_channel.send(msg)
    await active_channel.send("Napište !pick <id_balicku>")



def is_game_channel_active(ctx):
    for game in active_games:
        if game['channel_id'] == ctx.message.channel.id:
            return True
    return False

def is_player_in_game(ctx):
    for game in active_games:
        if ctx.message.author.id == game['player']:
            return True
    return False

def is_player_in_this_game(ctx):
    for game in active_games:
        if ctx.message.author.id == game['player'] and game['channel_id'] == ctx.message.channel.id:
            return True
    return False

@client.command()
async def list(ctx):
    sets = requests.get('http://localhost:3000/api/sets/').json()

    msg = ""
    prev_course = ""
    for i in range(len(sets)):
        if sets[i]['nazev'] != prev_course:
            msg += f"Předmět {sets[i]['nazev']} ({sets[i]['kod_predmetu']}): \n"
            prev_course = sets[i]['nazev']

        msg += f"Balíček {sets[i]['id_balicku']}\n"

    await ctx.channel.send(msg)

@client.command()
async def pick(ctx, input = None):
    if input is None:
        await ctx.channel.send("Musíte zadat ID balíčku.")
        return
    
    if not input.isdigit():
        await ctx.channel.send("ID balíčku musí být číslo.")
        return
    
    if not is_game_channel_active(ctx):
        await ctx.channel.send("Neběží žádná hra.")
        return
    
    if not is_player_in_this_game(ctx):
        await ctx.channel.send("Nejsi v této hře.")
        return
    
    package = input
    set = requests.get('http://localhost:3000/api/sets/' + package).json()

    if len(set) <= 0:
        await ctx.channel.send("Balíček neexistuje.")
        return
    
    for game in active_games:
        if game['channel_id'] == ctx.message.channel.id and ctx.message.author.id == game['player']:
            game['questions'] = set
            game['score'] = 0
            game['setid'] = package
            await ctx.channel.send("Balíček vybrán.")
            await ctx.channel.send("Začínáme hru. Odpovědi pište ve formátu !answer <A/B/C/D>")
            msg = set[0]['question']+ "\n"
            msg += "A: " + set[0]['options']['A'] + "\n"
            msg += "B: " + set[0]['options']['B'] + "\n"
            msg += "C: " + set[0]['options']['C'] + "\n"
            msg += "D: " + set[0]['options']['D'] + "\n"

            await ctx.channel.send(msg)
            break

@client.command(aliases=['a', 'ans'])
async def answer(ctx, input = None):
    if input is None:
        await ctx.channel.send("Musíte zadat odpověď.")
        return
    
    if not is_game_channel_active(ctx):
        await ctx.channel.send("Neběží žádná hra.")
        return
    
    if not is_player_in_this_game(ctx):
        await ctx.channel.send("Nejsi v této hře.")
        return

    answer = input.upper()
    for game in active_games:
        if game['channel_id'] == ctx.message.channel.id and ctx.message.author.id == game['player']:
            # game_index = active_games.index(game)
            if game['questions'][0]['right_answer'] == answer:
                game['score'] += 1
                await ctx.channel.send("Správně!")
            else:
                await ctx.channel.send("Špatně!")
            game['questions'].pop(0)

            if len(game['questions']) == 0:
                await ctx.channel.send("Konec hry!")
                await ctx.channel.send("Výsledky:")
                game_result = {
                    'userid': str(game['player']),
                    'score': game['score'],
                    'setid': game['setid'],
                }
                send_result = requests.post('http://localhost:3000/api/game-end', json=game_result)
                await ctx.channel.send(f"<@{game['player']}>: {game['score']}")
                game_index = active_games.index(game)
                active_games.pop(game_index)
            else:
                msg = game['questions'][0]['question']+ "\n"
                msg += "A: " + game['questions'][0]['options']['A'] + "\n"
                msg += "B: " + game['questions'][0]['options']['B'] + "\n"
                msg += "C: " + game['questions'][0]['options']['C'] + "\n"
                msg += "D: " + game['questions'][0]['options']['D'] + "\n"

                await ctx.channel.send(msg)
            break

@client.command(aliases=['rbs'])
async def ranking_by_set(ctx, input = None):
    if input is None:
        await ctx.channel.send("Musíte zadat ID balíčku.")
        return

    if not input.isdigit():
        await ctx.channel.send("ID balíčku musí být číslo.")
        return
    
    ranking = requests.get(f'http://localhost:3000/api/ranking-by-set/{input}').json()

    if len(ranking) <= 0:
        await ctx.channel.send("Tento balíček neexistuje.")
        return
    
    name = ranking[0]['nazev']
    id_bal = ranking[0]['id_balicku']
    msg = ""
    msg += "Předmět: " + name + " (" + ranking[0]['kod_predmetu'] + ")" + "\n"
    msg += "ID balíčku: " + str(id_bal) + "\n"
    for i in range(len(ranking)):        
        user = ctx.guild.get_member(216483389648142337)
        if user is None:
            continue
        username = user.name

        rank = ranking[i]["rank"]
        msg += str(i+1) + ". " + username + ": " + str(rank) + "\n"
    await ctx.channel.send(msg)

@client.command(aliases=['ra'])
async def ranking_all(ctx):
    ranking = requests.get('http://localhost:3000/api/ranking/').json()
    msg = ""
    for i in range(len(ranking)):
        nazev = ranking[i]['nazev_predmetu']
        kod = ranking[i]['kod_predmetu']
        id_bal = ranking[i]['id_balicku']
        user = int(ranking[i]['discord_id'])
        username = ctx.guild.get_member(user).name
        rank = ranking[i]['rank']
        
        msg += "Předmět: " + nazev + "\n"
        msg += "Kód předmětu: " + kod + "\n"
        msg += "ID balíčku: " + str(id_bal) + "\n"
        msg += "Top hráč: " + username + " s nejlepším skóre: " + str(rank) + "\n\n"

    await ctx.channel.send(msg)
    
@client.command(aliases=['ge', 'end'])
async def game_end(ctx):
    if not is_game_channel_active(ctx):
        await ctx.channel.send("Neběží žádná hra.")
        return
    
    if not is_player_in_this_game(ctx):
        await ctx.channel.send("Nejsi v této hře.")
        return
    
    for game in active_games:
        if game['channel_id'] == ctx.message.channel.id and ctx.message.author.id == game['player']:
            await ctx.channel.send("Konec hry! Výsledky nebyly zaznamenány.")
            active_games.pop(active_games.index(game))
            break

client.run(os.getenv('DISCORD_BOT_SECRET'))