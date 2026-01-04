import http.server
import socketserver
import json
import random
import os
from datetime import date
from urllib.parse import urlparse, parse_qs

PORT = 8000
DATA_FILE = "game_data.json"
DAILY_LIMIT = 10
TOTAL_CHARACTERS = 20

def load_data():
    if not os.path.exists(DATA_FILE):
        return initialize_data()
    with open(DATA_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return initialize_data()

def initialize_data():
    characters = []
    # Seed data (same as before)
    for i in range(1, TOTAL_CHARACTERS + 1):
        characters.append({
            'id': i,
            'name': f"Good Vibe #{i}",
            'wins': 0,
            'losses': 0,
            'matches': 0,
            'url': f"https://opensea.io/assets/ethereum/0xb8ea78fcacef50d41375e44e6814ebba36bb33c4/{i}",
            # Placeholder image for prototype: using generic colorful placeholder or specific pattern if available.
            # For now, let's use a nice robohash or similar for distinct visuals since we dont' have real IPFS links
            'image': f"https://ipfs.io/ipfs/QmY6JpwTYx6zZHgfJb3gPJRh1U897NX4RudtK5jhJ3sNDS/{i}.jpg" 
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

class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # API: Get Matchup
        if parsed_path.path == '/api/matchup':
            data = load_data()
            if data['user_state']['votes_today'] >= DAILY_LIMIT:
                 # Check if day changed
                if data['user_state']['last_played_date'] != str(date.today()):
                    data['user_state']['last_played_date'] = str(date.today())
                    data['user_state']['votes_today'] = 0
                    save_data(data)
                else:
                    self.send_response(403)
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Daily limit reached'}).encode())
                    return

            matchup = random.sample(data['characters'], 2)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(matchup).encode())
            return

        # API: Leaderboard
        elif parsed_path.path == '/api/leaderboard':
            data = load_data()
            # Sort by win rate desc, then wins
            chars = data['characters']
            for c in chars:
                c['win_rate'] = (c['wins'] / c['matches'] * 100) if c['matches'] > 0 else 0
            
            sorted_chars = sorted(chars, key=lambda x: (x['win_rate'], x['wins']), reverse=True)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(sorted_chars[:20]).encode()) # Top 20
            return
            
        # Serve Static Files
        else:
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/vote':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data)
            
            winner_id = payload.get('winnerId')
            loser_id = payload.get('loserId')
            
            data = load_data()
            
            # Check limit again just in case
            if data['user_state']['votes_today'] >= DAILY_LIMIT and data['user_state']['last_played_date'] == str(date.today()):
                 self.send_response(403)
                 self.end_headers()
                 self.wfile.write(json.dumps({'error': 'Daily limit reached'}).encode())
                 return

            # Update stats
            found_winner = False
            found_loser = False
            for char in data['characters']:
                if char['id'] == winner_id:
                    char['wins'] += 1
                    char['matches'] += 1
                    found_winner = True
                elif char['id'] == loser_id:
                    char['losses'] += 1
                    char['matches'] += 1
                    found_loser = True
            
            if found_winner and found_loser:
                data['user_state']['votes_today'] += 1
                data['user_state']['last_played_date'] = str(date.today())
                save_data(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'votes_today': data['user_state']['votes_today']}).encode())
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid character IDs'}).encode())
            return

print(f"Starting Good Vibes Server on http://localhost:{PORT}")
with socketserver.TCPServer(("", PORT), GameRequestHandler) as httpd:
    httpd.serve_forever()
