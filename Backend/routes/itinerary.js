const express = require("express");
const router = express.Router();
const Spot = require("../models/Spot");
const Event = require("../models/Event");
const axios = require("axios");

async function callGemini(prompt, maxTokens = 800) {
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens },
    },
  );
  return data.candidates[0].content.parts[0].text;
}

// Small wrapper to retry on transient network errors
async function safeCallGemini(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Daily Pulse — returns day-aware recommendations so itineraries
// feel contextually relevant (e.g. Saturday → Sip & Paint, Monday → spas)
function getDailyPulse() {
  const day = new Date().getDay();
  const dayName = DAY_NAMES[day];
  let pulse = "";
  if (day === 6)
    pulse =
      "Today is Saturday. Prioritize farmers markets and Sip & Paint style social creative spots.";
  else if (day === 1)
    pulse =
      "Today is Monday. Prioritize spas, quiet cafes, and low-key wellness experiences.";
  else if (day === 0)
    pulse =
      "Today is Sunday. Prioritize brunch spots, wellness retreats, and afternoon cultural venues.";
  else if (day === 5)
    pulse =
      "Today is Friday. Prioritize evening social spots, live music, and nightlife-adjacent cultural events.";
  else if (day === 4)
    pulse =
      "Today is Thursday. Prioritize art shows, gallery walks, and cultural night events.";
  else if (day === 3)
    pulse =
      "Today is Wednesday. Prioritize mid-week spa escapes, book cafes, and quiet cultural spots.";
  else if (day === 2)
    pulse =
      "Today is Tuesday. Prioritize creative workshops, hidden gems, and low-key social venues.";
  return { dayName, pulse };
}

// Time-Traveler Logic — checks if today matches specific dates for
// special event recommendations (e.g. NIBF Book Fair on May 13)
function getTimeTravelerEvents() {
  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();
  const events = [];

  // NIBF Book Fair — May 13
  if (month === 4 && date === 12) {
    events.push(
      "TOMORROW (May 13) is the Nigerian International Book Fair (NIBF) at Wole Soyinka Centre. STRONGLY RECOMMEND adding this to the itinerary.",
    );
  }
  if (month === 4 && date === 13) {
    events.push(
      "TODAY (May 13) is the Nigerian International Book Fair (NIBF) at Wole Soyinka Centre. This is the top recommendation.",
    );
  }

  // Bole Afri Fest — May 30
  if (month === 4 && date >= 25 && date <= 30) {
    events.push(
      "COMING UP (May 30): Bole Afri Fest at Gongola Park, Abuja. The biggest barbecue and culture festival.",
    );
  }

  // Lagos Igbo Hangout — June 21-22
  if (month === 5 && date >= 18 && date <= 22) {
    events.push(
      "COMING UP (June 21-22): Lagos Igbo Hangout at FHA Field, Festac. Heritage celebration.",
    );
  }

  // Blankets & Wine Nairobi — June 7
  if (month === 5 && date >= 4 && date <= 7) {
    events.push(
      "COMING UP (June 7): Blankets & Wine at Kasarani, Nairobi. Iconic outdoor music festival.",
    );
  }

  // Kenya Food Festival — August 14
  if (month === 7 && date >= 11 && date <= 14) {
    events.push(
      "COMING UP (Aug 14): Kenya Food Festival at Uhuru Gardens, Nairobi. All 47 counties represented.",
    );
  }

  return events;
}

// Fallback itinerary — used when the AI provider fails
// Picks random spots by pillar to produce a reasonable-looking 2-day plan
function buildFallbackItinerary(city, interests, spots) {
  const { dayName, pulse } = getDailyPulse();
  const culture = spots.filter((s) => s.pillar === "CULTURE");
  const wellness = spots.filter((s) => s.pillar === "WELLNESS");
  const social = spots.filter((s) => s.pillar === "SOCIAL");

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const morning1 = pick(wellness) || pick(culture);
  const afternoon1 = pick(culture) || pick(social);
  const evening1 = pick(culture) || pick(social);
  const morning2 = pick(wellness) || pick(social);
  const afternoon2 = pick(social) || pick(culture);
  const evening2 = pick(culture) || pick(wellness);

  return `*Daily Pulse:* ${dayName} — ${pulse || "A great day to explore!"}

**Day 1 — Arrival & Vibe Check**

*10:00 AM — ${morning1.name}*
${morning1.type}: ${morning1.details}
*Tip:* ${morning1.tip}

*1:00 PM — ${afternoon1.name}*
${afternoon1.type}: ${afternoon1.details}
*Tip:* ${afternoon1.tip}

*7:00 PM — ${evening1.name}*
${evening1.type}: ${evening1.details}
*Tip:* ${evening1.tip}

---

**Day 2 — Deep Dive**

*9:00 AM — ${morning2.name}*
${morning2.type}: ${morning2.details}
*Tip:* ${morning2.tip}

*12:30 PM — ${afternoon2.name}*
${afternoon2.type}: ${afternoon2.details}
*Tip:* ${afternoon2.tip}

*6:00 PM — ${evening2.name}*
${evening2.type}: ${evening2.details}
*Tip:* ${evening2.tip}`;
}

// Call AI provider (Gemini) via `callGemini` defined above

// Apply advisory tips based on places and activities mentioned in the itinerary
function applyAdvisoryTips(itinerary) {
  // Add advisory tips based on specific locations or activities mentioned
  let updatedItinerary = itinerary;

  // Beach-related advisories
  if (
    updatedItinerary.includes("Pop Beach") ||
    updatedItinerary.includes("Landmark Beach") ||
    updatedItinerary.includes("Tarkwa Bay")
  ) {
    const beachTip =
      "\n*Tip:* Bring swimwear, sunscreen, and polarized sunglasses for the Atlantic glare.";
    // Add tip after beach mentions if not already present
    if (
      !updatedItinerary.includes(
        "Bring swimwear, sunscreen, and polarized sunglasses",
      )
    ) {
      updatedItinerary = updatedItinerary.replace(
        /(\*Tip:.*?)/g,
        `$1${beachTip}`,
      );
    }
  }

  // Bole Afri Fest advisory
  if (
    updatedItinerary.includes("Bole Afri Fest") ||
    updatedItinerary.includes("Gongola Park")
  ) {
    const boleTip =
      "\n*Tip:* Expect high crowds at Gongola Park — arrive by 2 PM for the best food selections.";
    if (!updatedItinerary.includes("Expect high crowds at Gongola Park")) {
      updatedItinerary = updatedItinerary.replace(
        /(\*Tip:.*?)/g,
        `$1${boleTip}`,
      );
    }
  }

  // Lekki Conservation Centre advisory
  if (updatedItinerary.includes("Lekki Conservation Centre")) {
    const lekkiTip = "\n*Tip:* Wear comfortable sneakers for the canopy walk.";
    if (
      !updatedItinerary.includes(
        "Wear comfortable sneakers for the canopy walk",
      )
    ) {
      updatedItinerary = updatedItinerary.replace(
        /(\*Tip:.*?)/g,
        `$1${lekkiTip}`,
      );
    }
  }

  // Performing arts evening advisory
  if (
    (updatedItinerary.includes("Terra Kulture") ||
      updatedItinerary.includes("National Theatre")) &&
    (updatedItinerary.includes("7:00 PM") ||
      updatedItinerary.includes("7:00pm"))
  ) {
    const artsTip =
      "\n*Tip:* Arrive 30 minutes early to browse the craft shop and art gallery before the curtains rise.";
    if (
      !updatedItinerary.includes(
        "Arrive 30 minutes early to browse the craft shop and art gallery",
      )
    ) {
      updatedItinerary = updatedItinerary.replace(
        /(\*Tip:.*?)/g,
        `$1${artsTip}`,
      );
    }
  }

  // General hiking/outdoor advisory
  if (
    updatedItinerary.includes("hiking") ||
    updatedItinerary.includes("trail") ||
    updatedItinerary.includes("canopy walk") ||
    updatedItinerary.includes("outdoor")
  ) {
    const outdoorTip = "\n*Tip:* Wear comfortable sneakers and bring water.";
    if (
      !updatedItinerary.includes("Wear comfortable sneakers and bring water")
    ) {
      updatedItinerary = updatedItinerary.replace(
        /(\*Tip:.*?)/g,
        `$1${outdoorTip}`,
      );
    }
  }

  return updatedItinerary;
}

// POST /api/itinerary — generates a 2-day cultural itinerary
// Uses Gemini AI; falls back to hardcoded itinerary on failure
router.post("/", async (req, res) => {
  const { city, interests } = req.body;

  try {
    const spots = await Spot.find({
      city: { $regex: city, $options: "i" },
    });

    if (spots.length === 0) {
      return res.json({
        itinerary: `No spots found for ${city}. Please check the city name and try again.`,
      });
    }

    const approvedEvents = await Event.find({
      city: { $regex: city, $options: "i" },
      status: "approved",
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .limit(10)
      .populate("linkedSpotId", "name");

    const spotList = spots
      .map(
        (s) =>
          `- ${s.name} (${s.type}) [${s.vibeTags.join(", ")}]: ${s.details}`,
      )
      .join("\n");

    const eventList =
      approvedEvents.length > 0
        ? approvedEvents
            .map((e) => {
              const d = new Date(e.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const venue = e.linkedSpotId ? ` @ ${e.linkedSpotId.name}` : "";
              return `- ${d} ${e.time || ""} — ${e.name} (${e.type || "Event"})${venue}: ${e.description || ""}`;
            })
            .join("\n")
        : "No upcoming events found.";

    const { dayName, pulse } = getDailyPulse();
    const timeTravelerEvents = getTimeTravelerEvents();
    const timeTravelerBlock =
      timeTravelerEvents.length > 0
        ? `\nSPECIAL DATE-BASED ALERTS:\n${timeTravelerEvents.join("\n")}`
        : "";

    const prompt = `
      You are a cultural travel assistant for Africa with deep local knowledge of Lagos, Abuja, Kigali, and Nairobi.
 
      The user is visiting ${city} for 2 days and is interested in: ${interests}.
      Today is ${dayName}. ${pulse}${timeTravelerBlock}

      Here are the available spots in ${city}:
      ${spotList}

      Here are the upcoming events in ${city}:
      ${eventList}

      === VIBE MATCH RULES (APPLY THESE) ===
      You MUST match the user's interests to these experience categories:
      - If interested in "Deep Relaxation" or "wellness" → Prioritize Pop Beach Ilashe, Oriki Spa, The Truth Beach Club, Oma the Spa
      - If interested in "Art & History" or "culture" → Prioritize Lagos Gallery Weekend, Fanti Carnival, Terra Kulture, JK Randle Centre, National Theatre
      - If interested in "Social" or "creative" → Prioritize Sip and Paint, TKD Farms Market, Urban Greenland, Hard Rock Cafe
      - If interested in "Intense Culture" → You MUST pair JK Randle Centre (Lagos) with Amaraba Dance (Kigali) or similar deep heritage experiences
      - If interested in "Modern Energy" → You MUST pair Nuvolition Fashion (Lagos) with Furaha Festival (Nairobi) or similar contemporary events
      - If interested in "Music" or "jazz" → Prioritize Muson Centre, Private Jams, The Jazz Lounge, Blankets & Wine
      - If interested in "Food" → Prioritize Carnivore Restaurant, TKD Farms Market, Kenya Food Festival, Bole Afri Fest

      === EVENING LOGIC (APPLY THIS) ===
      - If the user is interested in "Culture", you MUST check for #PerformingArts spots in the available data.
      - If #PerformingArts spots are available, you MUST suggest the best one for the 7:00 PM evening slot.
      - If you select a #PerformingArts spot like Terra Kulture or National Theatre for evening, you MUST add the advisory:
        "Arrive 30 minutes early to browse the craft shop and art gallery before the curtains rise."

      === ADVISORY AUTOMATION (APPLY THESE) ===
      You MUST apply these specific tips when the corresponding spots/events are mentioned:
      - For beach spots (Pop Beach, Landmark Beach, Tarkwa Bay): Add tip "Bring swimwear, sunscreen, and polarized sunglasses for the Atlantic glare."
      - For Bole Afri Fest: Add tip "Expect high crowds at Gongola Park — arrive by 2 PM for the best food selections."
      - For Lekki Conservation Centre: Add tip "Wear comfortable sneakers for the canopy walk."
      - For any hiking/outdoor activities: Add tip "Wear comfortable sneakers and bring water."
      - For performing arts evening events: Add tip "Arrive 30 minutes early to browse the craft shop and art gallery before the curtains rise."

      === INTEREST MAPPING (APPLY THESE) ===
      You MUST prioritize these spots based on user interests:
      - "relaxation" or "wellness" → prioritize #ActiveWellness and #HiddenGem spots, especially spas and retreats
      - "art" or "culture" → prioritize #PerformingArts and #SocialCreative spots, plus gallery/arts events
      - "social" → prioritize #SocialCreative spots, especially evening and weekend venues
      - "adventure" → prioritize #ActiveWellness spots with outdoor activities
      - "quiet" or "intellectual" → prioritize #QuietIntellectual spots (bookshops, museums, galleries)
      - "hidden gems" → prioritize #HiddenGem spots (Lasena Hot Springs, Orchid Bistro, Sabyinyo Lodge)

      === DAILY PULSE ===
      You MUST respect the Daily Pulse: ${dayName} — ${pulse || "A great day to explore!"}
      ${timeTravelerBlock ? `\nYou MUST integrate the following time-traveler alerts where relevant:\n${timeTravelerBlock}` : ""}

      Output Format:
      - Start with exactly: "Daily Pulse: ${dayName} — ${pulse || "A great day to explore!"}"
      - Use **Day 1 — Title** for day headings
      - *10:00 AM — Spot Name* for time slots
      - Description and details on the next line
      - *Tip:* for practical tips (place this on the line after the spot description)
      - Separate days with ---
      - Keep the vibe warm, knowledgeable, and luxurious
      - ALWAYS include practical tips for each recommended spot or activity
      - If you recommend a specific spot from the data, include its specific tip from that spot's data if available
    `;

    let text;
    try {
      text = await safeCallGemini(prompt);
      text = applyAdvisoryTips(text);
    } catch (aiErr) {
      console.log(
        "AI provider error, using fallback itinerary:",
        aiErr.message || aiErr,
      );
      text = buildFallbackItinerary(city, interests, spots);
      text = applyAdvisoryTips(text);
    }

    res.json({ itinerary: text });
  } catch (err) {
    const spots = await Spot.find({
      city: { $regex: city || "", $options: "i" },
    }).catch(() => []);
    const fallback =
      spots.length > 0
        ? buildFallbackItinerary(city, interests, spots)
        : `**Day 1 — Arrival & Exploration**\n\nExplore the cultural and wellness spots ${city || "in your chosen city"}.\n\n**Day 2 — Deep Dive**\n\nContinue your journey with more immersive experiences.`;
    res.json({ itinerary: fallback });
  }
});

module.exports = router;
