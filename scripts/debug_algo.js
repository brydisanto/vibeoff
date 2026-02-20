const { createClient } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });
const traitMap = require('../lib/trait_map.json');

const TRAIT_GROUPS = [
    { keyword: 'Headphones', groupName: 'Headphones' },
    { keyword: 'Middle Part', groupName: 'Middle Parts' },
    { keyword: 'Wide Brim Hat', groupName: 'Wide Brim Hats' },
    { keyword: 'Top Messy', groupName: 'Top Messy Hair' },
    { keyword: 'Bowl Cut', groupName: 'Bowl Cuts' },
    { keyword: 'Mohawk', groupName: 'Mohawks' },
    { keyword: 'Flat Top', groupName: 'Flat Tops' },
    { keyword: 'Manbun', groupName: 'Manbuns' },
    { keyword: 'Classic', groupName: 'Classic Hair' },
    { keyword: 'Ballcap', groupName: 'Ballcaps', exclude: ['Ballcap Forward Black SuperRare'] },
    { keyword: 'Short', groupName: 'Short Hair' },
    { keyword: 'Afro', groupName: 'Afros' },
    { keyword: 'Moto Helmet', groupName: 'Moto Helmets' },
    { keyword: 'Comb Over', groupName: 'Comb Overs' },
    { keyword: 'Bucket Hat', groupName: 'Bucket Hats', exclude: ['Bucket Hat Black SuperRare'] },
    { keyword: 'Slick Back', groupName: 'Slick Back Hair' },
    { keyword: 'Backwards Hat', groupName: 'Backwards Hats' },
    { keyword: 'Dundee Hat', groupName: 'Dundee Hats' },
    { keyword: 'Beanie', groupName: 'Beanies' },
    { keyword: 'Football Helmet', groupName: 'Football Helmets' },
    { keyword: 'Female Bob Cut', groupName: 'Bobs' },
    { keyword: 'Female Ponytail', groupName: 'Ponytails' },
    { keyword: 'Female Bun', groupName: 'Buns' },
    { keyword: 'Knight Helm', groupName: 'Knight Helmets' },
    { keyword: 'Aviator Sunglasses', groupName: 'Aviators' },
    { keyword: 'Hex Sunglasses', groupName: 'Hex Sunglasses' },
    { keyword: 'Library Glasses', groupName: 'Library Glasses' },
    { keyword: 'Cubic Sunglasses', groupName: 'Cubic Sunglasses' },
    { keyword: 'Robo Visor', groupName: 'Robo Visors' },
    { keyword: 'Diver Mask', groupName: 'Diver Masks' },
    { keyword: '80s Glasses', groupName: '80s Glasses' },
    { keyword: 'Snowboard Goggles', groupName: 'Snowboard Goggles' },
    { keyword: 'Circle Glasses', groupName: 'Circle Glasses' },
    { keyword: 'Nouns Glasses', groupName: 'Nouns Glasses' },
    { keyword: 'Beard', groupName: 'Beards', exclude: ['Beard Sweettooth'] },
    { keyword: 'Henley', groupName: 'Henleys' },
    { keyword: 'Short Sleeve Button Up', groupName: 'Short Sleeve Button Ups' },
    { keyword: 'Plastic Armor', groupName: 'Plastic Armor' },
    { keyword: 'TShirt', groupName: 'Graphic Tees' },
    { keyword: 'Retro Windbreaker', groupName: 'Retro Windbreakers' },
    { keyword: 'Suit', groupName: 'Suits' },
    { keyword: 'Overalls', groupName: 'Overalls & Shirts' },
    { keyword: 'Leather Jacket', groupName: 'Leather Jackets' },
    { keyword: 'Turtleneck', groupName: 'Turtlenecks' },
    { keyword: 'Letterman Jacket', groupName: 'Letterman Jackets' },
    { keyword: 'Hoodie White', groupName: 'VSC Hoodie' },
    { keyword: 'Puffy Jacket', groupName: 'Puffy Jackets' },
    { keyword: 'Puffy Vest', groupName: 'Puffy Vests' },
    { keyword: 'Driving Jacket', groupName: 'Driving Jackets' },
    { keyword: 'Pilot Jacket', groupName: 'Pilot Jackets' },
    { keyword: 'Hooded Jacket', groupName: 'Hooded Jackets' },
    { keyword: 'Fur Jacket', groupName: 'Fur Jackets' },
    { keyword: 'Hoodie Up', groupName: 'Hoodie Ups', exclude: ['Hoodie Up Doge', 'Hoodie Up Pepe'] },
    { keyword: 'Hoodie', groupName: 'Hoodies (Down)', exclude: ['Hoodie Up Doge', 'Hoodie Up Pepe', 'Hoodie Black SuperRare'] },
    { keyword: 'Surfer', groupName: 'Surfers' },
    { keyword: 'Farmer Plants', groupName: 'Farmer & Plants' },
];

const getGroupedTraitName = (value) => {
    for (const rule of TRAIT_GROUPS) {
        if (value.includes(rule.keyword)) {
            if (rule.exclude && rule.exclude.includes(value)) continue;
            return rule.groupName;
        }
    }
    return value;
};

const getGvcTraits = (id) => {
    const traits = (traitMap)[String(id)];
    if (!traits) return [];
    return Object.values(traits).map(v => getGroupedTraitName(String(v)));
};

async function main() {
    const kv = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });

    const rawVotes = await kv.lrange('votes:wallet:0xf7daddb9553d6c0ad80c66c7cfff281b1d5f35ad', 0, -1);
    const votes = rawVotes.map(v => typeof v === 'string' ? JSON.parse(v) : v).filter(Boolean);

    const traitRawScores = {};
    const traitVoteCounts = {};
    const traitAppearances = {};

    for (const vote of votes) {
        const winnerTraits = getGvcTraits(vote.winnerId);
        const loserTraits = getGvcTraits(vote.loserId);

        for (const trait of winnerTraits) {
            traitRawScores[trait] = (traitRawScores[trait] || 0) + 1;
            traitAppearances[trait] = (traitAppearances[trait] || 0) + 1;
            if (!traitVoteCounts[trait]) traitVoteCounts[trait] = { voted: 0, rejected: 0 };
            traitVoteCounts[trait].voted++;
        }

        for (const trait of loserTraits) {
            traitRawScores[trait] = (traitRawScores[trait] || 0) - 0.5;
            traitAppearances[trait] = (traitAppearances[trait] || 0) + 1;
            if (!traitVoteCounts[trait]) traitVoteCounts[trait] = { voted: 0, rejected: 0 };
            traitVoteCounts[trait].rejected++;
        }
    }

    const BAYESIAN_K = 10;
    const traitObservedRates = {};
    for (const trait of Object.keys(traitRawScores)) {
        const appearance = traitAppearances[trait] || 1;
        traitObservedRates[trait] = traitRawScores[trait] / appearance;
    }

    const totalRawScore = Object.values(traitRawScores).reduce((sum, score) => sum + score, 0);
    const totalAppearances = Object.values(traitAppearances).reduce((sum, app) => sum + app, 0);
    const priorRate = totalRawScore / totalAppearances;

    const traitScores = {};
    for (const trait of Object.keys(traitRawScores)) {
        const n = traitAppearances[trait] || 1;
        const observed = traitObservedRates[trait];
        traitScores[trait] = (n * observed + BAYESIAN_K * priorRate) / (n + BAYESIAN_K);
    }

    console.log(`Prior Rate: ${priorRate}`);

    const favoriteTraits = Object.entries(traitScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([trait, score]) => ({
            trait,
            score: Math.round(score * 10) / 10,
            timesVotedFor: traitVoteCounts[trait]?.voted || 0,
            timesRejected: traitVoteCounts[trait]?.rejected || 0
        }));

    console.log('Top traits:', JSON.stringify(favoriteTraits, null, 2));
}

main().catch(console.error);
