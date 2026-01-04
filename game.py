import json
import random
import os
from datetime import datetime, date

DATA_FILE = "game_data.json"
DAILY_LIMIT = 10
TOTAL_CHARACTERS = 20 # Subset for prototype

# ASCII Art for Vibes
LOGO = """
   ______                __   _    ___ __               
  / ____/___  ____  ____/ /  | |  / (_) /_  ___  _____
 / / __/ __ \/ __ \/ __  /   | | / / / __ \/ _ \/ ___/
/ /_/ / /_/ / /_/ / /_/ /    | |/ / / /_/ /  __(__  ) 
\____/\____/\____/\__,_/     |___/_/_.___/\___/____/  
      Good Vibes Club - 1v1 Battle Prototype
"""

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def load_data():
    if not os.path.exists(DATA_FILE):
        return initialize_data()
    
    with open(DATA_FILE, 'r') as f:
        try:
            data = json.load(f)
            # Simple validation to ensure structure exists
            if 'characters' not in data or 'user_state' not in data:
                return initialize_data()
            return data
        except json.JSONDecodeError:
            return initialize_data()

def initialize_data():
    # Seeding dummy data for the prototype
    characters = []
    for i in range(1, TOTAL_CHARACTERS + 1):
        characters.append({
            'id': i,
            'name': f"Good Vibe #{i}",
            'wins': 0,
            'losses': 0,
            'matches': 0,
            'url': f"https://opensea.io/assets/ethereum/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4/{i}"
        })
    
    data = {
        'characters': characters,
        'user_state': {
            'last_played_date': str(date.today()),
            'votes_today': 0
        }
    }
    save_data(data)
    return data

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def check_daily_limit(data):
    today = str(date.today())
    state = data['user_state']
    
    if state['last_played_date'] != today:
        # New day, reset counter
        state['last_played_date'] = today
        state['votes_today'] = 0
        save_data(data)
        return True
        
    if state['votes_today'] >= DAILY_LIMIT:
        return False
        
    return True

def get_matchup(data):
    return random.sample(data['characters'], 2)

def vote(data, winner_id, loser_id):
    # Update Characters
    for char in data['characters']:
        if char['id'] == winner_id:
            char['wins'] += 1
            char['matches'] += 1
        elif char['id'] == loser_id:
            char['losses'] += 1
            char['matches'] += 1
    
    # Update User State
    data['user_state']['votes_today'] += 1
    save_data(data)

def show_leaderboard(data):
    clear_screen()
    print(LOGO)
    print("\n🏆 LEADERBOARD 🏆")
    print(f"{'Rank':<6} {'Name':<15} {'Wins':<6} {'Losses':<8} {'Win Rate':<10}")
    print("-" * 50)
    
    # Sort: Win Rate desc, then Wins desc
    def sort_key(c):
        wr = (c['wins'] / c['matches']) if c['matches'] > 0 else 0
        return (wr, c['wins'])
    
    sorted_chars = sorted(data['characters'], key=sort_key, reverse=True)
    
    for idx, char in enumerate(sorted_chars[:10], 1): # Top 10
        win_rate = (char['wins'] / char['matches'] * 100) if char['matches'] > 0 else 0.0
        print(f"{idx:<6} {char['name']:<15} {char['wins']:<6} {char['losses']:<8} {win_rate:.1f}%")
        
    print("\nSee full collection: https://opensea.io/collection/good-vibes-club")
    input("\nPress Enter to return to menu...")

def play_game(data):
    while True:
        if not check_daily_limit(data):
            clear_screen()
            print(LOGO)
            print("\n🚫 DAILY LIMIT REACHED 🚫")
            print(f"You have cast your {DAILY_LIMIT} votes for today.")
            print("Come back tomorrow for more vibes!")
            input("\nPress Enter to return to menu...")
            return

        matchup = get_matchup(data)
        c1, c2 = matchup[0], matchup[1]
        
        clear_screen()
        print(LOGO)
        print(f"\nVotes Remaining Today: {DAILY_LIMIT - data['user_state']['votes_today']}")
        print("\n⚔️  MATCHUP TIME ⚔️\n")
        
        print(f"LEFT:  {c1['name']}")
        print(f"       🔗 {c1['url']}")
        print("\n         VS\n")
        print(f"RIGHT: {c2['name']}")
        print(f"       🔗 {c2['url']}")
        
        print("\n[L] Vote Left   [R] Vote Right   [Q] Quit to Menu")
        choice = input("\nYour Vote > ").upper()
        
        if choice == 'L':
            vote(data, c1['id'], c2['id'])
            print("\n✅ Voted for LEFT!")
        elif choice == 'R':
            vote(data, c2['id'], c1['id'])
            print("\n✅ Voted for RIGHT!")
        elif choice == 'Q':
            break
        else:
            input("Invalid choice! Press Enter...")

def main():
    while True:
        data = load_data()
        clear_screen()
        print(LOGO)
        print("\n1. 🎮 Start Voting")
        print("2. 🏆 View Leaderboard")
        print("3. ❌ Exit")
        
        choice = input("\nSelect an option > ")
        
        if choice == '1':
            play_game(data)
        elif choice == '2':
            show_leaderboard(data)
        elif choice == '3':
            print("Good Vibes Only! Bye!")
            break
        else:
            pass

if __name__ == "__main__":
    main()
