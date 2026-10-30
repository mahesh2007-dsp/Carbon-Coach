import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ─── Emission factor registry (real-world data) ─────────────────────────────
// Sources: UK DEFRA 2024 GHG Conversion Factors, EPA, Our World in Data, IEA 2023

// kg CO₂e per passenger-km (DEFRA 2024)
const TRAVEL_FACTORS: Record<string, number> = {
  bus: 0.103,
  car: 0.192,
  train: 0.035,
  bike: 0,
  walk: 0,
  plane: 0.255,
  motorcycle: 0.118,
  ev: 0.047,
};

// Average power draw in kW (US DOE Energy Star, EIA 2023)
const APPLIANCE_POWER_KW: Record<string, number> = {
  fan: 0.075,      // ceiling fan (Energy Star)
  ac: 1.5,         // air conditioner (1.5-ton central)
  heater: 1.8,     // space heater
  refrigerator: 0.15,
  fridge: 0.15,
  washing_machine: 0.5,
  washer: 0.5,
  dishwasher: 1.0,
  microwave: 1.2,
  oven: 2.4,       // electric oven
  tv: 0.1,         // LED TV
  television: 0.1,
  computer: 0.15,  // desktop
  desktop: 0.15,
  laptop: 0.065,
  lights: 0.06,    // LED bulb
  bulb: 0.06,
  iron: 1.1,
  vacuum: 0.65,
  water_heater: 1.5,
  geyser: 1.5,
  pump: 0.37,      // water pump
  microwave_oven: 1.2,
  electric_kettle: 1.5,
  kettle: 1.5,
  dryer: 3.0,      // clothes dryer
  monitor: 0.04,
  router: 0.01,
  charger: 0.005,
  speaker: 0.02,
  printer: 0.05,
  gaming_console: 0.15,
  blender: 0.3,
  toaster: 0.9,
  rice_cooker: 0.4,
  slow_cooker: 0.2,
  air_fryer: 1.4,
  hair_dryer: 1.5,
};

// Global grid average (IEA 2023: ~410 g CO₂e/kWh)
const ELECTRICITY_FACTOR_KG_PER_KWH = 0.41;

// kg CO₂e per kg of food product (Our World in Data / Poore & Nemecek 2018)
const FOOD_FACTORS: Record<string, number> = {
  beef: 49.5,       // beef (beef herd)
  beef_dairy: 33.3, // beef from dairy herd
  lamb: 39.7,
  pork: 12.3,
  chicken: 9.9,
  fish: 13.6,      // farmed fish
  seafood: 13.6,
  cheese: 23.9,
  egg: 4.7,
  eggs: 4.7,
  rice: 4.5,       // paddy methane
  pasta: 1.7,
  bread: 1.6,
  wheat: 1.6,
  potato: 2.9,
  tomato: 1.7,
  banana: 0.7,
  apple: 0.4,
  orange: 0.5,
  vegetarian: 1.7, // mixed veg meal
  vegan: 1.0,
  plant_based: 1.0,
  plant: 1.0,
  tofu: 3.0,
  coffee: 28.5,    // per kg of coffee (high due to roasting + transport)
  tea: 21.0,       // per kg of tea leaves
  milk: 3.2,       // cow's milk
  dairy: 3.2,
  soy_milk: 1.0,
  oat_milk: 0.9,
  almond_milk: 0.7,
  meal: 2.5,       // generic mixed meal
  lunch: 2.5,
  dinner: 2.5,
  breakfast: 1.5,
  snack: 0.5,
  chocolate: 34.6, // per kg (cocoa + sugar + milk)
  sugar: 3.2,
  olive_oil: 6.0,
  oil: 3.5,
};

// Per-meal defaults for non-weight-based foods (single serving, kg)
const FOOD_PER_SERVING_KG: Record<string, number> = {
  beef: 0.25, lamb: 0.2, pork: 0.15, chicken: 0.2, fish: 0.15,
  cheese: 0.05, egg: 0.06, eggs: 0.06, milk: 0.2,
  meal: 0.35, lunch: 0.35, dinner: 0.35, breakfast: 0.2,
  vegetarian: 0.35, vegan: 0.35, plant_based: 0.35, plant: 0.35,
  coffee: 0.01, tea: 0.005,
  chocolate: 0.05, tofu: 0.1,
};

// Waste: kg CO₂e per kg (EPA WARM model) and per small plastic item
const WASTE_FACTOR_KG_PER_KG = 2.21;  // landfilled mixed waste (EPA WARM)
const WASTE_FACTOR_KG_PER_ITEM = 0.022; // plastic bottle manufacture (EPA)

// Shopping: kg CO₂e per item (various LCA studies)
const SHOPPING_FACTORS: Record<string, number> = {
  clothing: 10.0,     // generic garment
  tshirt: 8.0,        // cotton t-shirt (MIT LCA)
  shirt: 8.0,
  jeans: 33.4,        // denim (Levi's LCA)
  pants: 20.0,
  shoes: 14.0,        // sneakers
  jacket: 25.0,
  coat: 30.0,
  dress: 15.0,
  electronics: 100.0, // generic electronics
  phone: 75.0,        // smartphone (Apple ESG report)
  laptop_device: 295.0, // laptop (Dell LCA)
  tablet: 130.0,
  monitor_screen: 200.0,
  tv_device: 500.0,
  furniture: 90.0,    // wooden furniture
  books: 1.2,
  book: 2.3,          // paperback (full LCA)
  paper: 1.2,
  plastic: 2.0,
  glass: 0.8,
  bag: 0.04,          // plastic bag
  default: 5.0,
};

// ─── Tool declarations ─────────────────────────────────────────────────────
const toolDeclarations = [{
  functionDeclarations: [
    {
      name: "calculate_travel_emissions",
      description: "Calculate kg CO₂e for travel by bus, car, train, bike, walk, plane, motorcycle, or ev. Always call this before quoting travel emissions.",
      parameters: {
        type: "OBJECT",
        properties: {
          mode: { type: "STRING", description: "One of: bus, car, train, bike, walk, plane, motorcycle, ev" },
          km: { type: "NUMBER", description: "Distance travelled in kilometers" },
        },
        required: ["mode", "km"],
      },
    },
    {
      name: "calculate_electricity_emissions",
      description: "Calculate kg CO₂e from appliance usage hours. Use appliance values like: fan (ceiling fan), ac (air conditioner), heater, refrigerator, washing_machine, dishwasher, microwave, oven, tv, computer, lights, iron, water_heater, kettle. Ceiling fan uses a lower power factor than AC — never treat fan hours as AC.",
      parameters: {
        type: "OBJECT",
        properties: {
          appliance: { type: "STRING", description: "Appliance identifier (e.g., fan, ac, heater, refrigerator)" },
          hours: { type: "NUMBER", description: "Number of hours the appliance was used" },
        },
        required: ["appliance", "hours"],
      },
    },
    {
      name: "calculate_food_emissions",
      description: "Calculate kg CO₂e for a food item or meal. If quantity is in kg, use weight mode; if it is a count of meals/servings, use serving mode.",
      parameters: {
        type: "OBJECT",
        properties: {
          food: { type: "STRING", description: "Food type (e.g., beef, chicken, vegetarian, vegan, rice, coffee)" },
          quantity: { type: "NUMBER", description: "Amount (weight in kg or count of servings)" },
          unit: { type: "STRING", description: "Either 'kg' for weight or 'serving' for a meal count" },
        },
        required: ["food", "quantity", "unit"],
      },
    },
    {
      name: "calculate_waste_emissions",
      description: "Calculate kg CO₂e from waste. Use 'kg' for weight-based waste or 'items' for count of items.",
      parameters: {
        type: "OBJECT",
        properties: {
          quantity: { type: "NUMBER", description: "Amount of waste" },
          unit: { type: "STRING", description: "Either 'kg' or 'items'" },
        },
        required: ["quantity", "unit"],
      },
    },
    {
      name: "calculate_shopping_emissions",
      description: "Calculate kg CO₂e from a purchased item like clothing, electronics, furniture, or books.",
      parameters: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING", description: "Item type (e.g., clothing, electronics, shoes, book)" },
          quantity: { type: "NUMBER", description: "Number of items" },
        },
        required: ["item", "quantity"],
      },
    },
    {
      name: "log_activity",
      description: "Persist one activity after a calculation tool has produced its exact emissions value. Pass the exact emissions_kg returned by the calculator. Never invent or round emissions values.",
      parameters: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", description: "One of: travel, electricity, food, waste, shopping" },
          label: { type: "STRING", description: "Human-readable description (e.g., 'Bus travel', 'Ceiling fan', 'Vegetarian lunch')" },
          quantity: { type: "NUMBER", description: "The measured quantity used for the calculation" },
          unit: { type: "STRING", description: "Unit like km, kWh, serving, kg, items, item" },
          emissions_kg: { type: "NUMBER", description: "Exact kg CO₂e from the calculator tool" },
        },
        required: ["category", "label", "quantity", "unit", "emissions_kg"],
      },
    },
    {
      name: "get_summary",
      description: "Return the saved emissions summary — total kg CO₂e, per-category breakdown, and activity count from the database.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "get_recent_activities",
      description: "Return the user's recently logged activities with their categories and emissions.",
      parameters: {
        type: "OBJECT",
        properties: {
          limit: { type: "NUMBER", description: "How many recent activities to return (default 10)" },
        },
      },
    },
    {
      name: "suggest_reductions",
      description: "Return practical, personalized carbon reduction suggestions with estimated savings based on the user's logged activities.",
      parameters: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", description: "Optional category to focus suggestions on (travel, electricity, food, waste, shopping)" },
        },
      },
    },
  ],
}];

// ─── Types ────────────────────────────────────────────────────────────────
type Activity = {
  category: string;
  label: string;
  quantity: number;
  unit: string;
  emissions_kg: number;
};

type ToolResult = Record<string, unknown>;

// ─── Tool implementations ──────────────────────────────────────────────────
function calculateTravel(args: { mode?: string; km?: number }): ToolResult {
  const mode = (args.mode ?? "").toLowerCase().trim();
  const km = Number(args.km ?? 0);
  const factor = TRAVEL_FACTORS[mode];
  if (factor === undefined) {
    return { error: `Unknown travel mode "${args.mode}". Use one of: ${Object.keys(TRAVEL_FACTORS).join(", ")}.` };
  }
  if (km <= 0) return { error: "Distance must be a positive number." };
  const emissions_kg = Number((km * factor).toFixed(2));
  return { mode, km, emissions_kg, factor_kg_per_km: factor };
}

function calculateElectricity(args: { appliance?: string; hours?: number }): ToolResult {
  const appliance = (args.appliance ?? "").toLowerCase().trim();
  const hours = Number(args.hours ?? 0);
  const powerKw = APPLIANCE_POWER_KW[appliance];
  if (powerKw === undefined) {
    return { error: `Unknown appliance "${args.appliance}". Use one of: ${Object.keys(APPLIANCE_POWER_KW).join(", ")}.` };
  }
  if (hours <= 0) return { error: "Hours must be a positive number." };
  const kwh = Number((hours * powerKw).toFixed(2));
  const emissions_kg = Number((kwh * ELECTRICITY_FACTOR_KG_PER_KWH).toFixed(2));
  return {
    appliance,
    hours,
    kwh,
    emissions_kg,
    factor_kg_per_kwh: ELECTRICITY_FACTOR_KG_PER_KWH,
    power_kw: powerKw,
  };
}

function calculateFood(args: { food?: string; quantity?: number; unit?: string }): ToolResult {
  const food = (args.food ?? "").toLowerCase().trim();
  const quantity = Number(args.quantity ?? 0);
  const unit = (args.unit ?? "").toLowerCase().trim();
  if (quantity <= 0) return { error: "Quantity must be a positive number." };

  const perKg = FOOD_FACTORS[food];
  if (perKg === undefined) {
    return { error: `Unknown food "${args.food}". Try: ${Object.keys(FOOD_FACTORS).slice(0, 12).join(", ")}.` };
  }

  let weightKg: number;
  if (unit === "kg") {
    weightKg = quantity;
  } else {
    // serving mode — convert to weight using per-serving defaults
    const perServing = FOOD_PER_SERVING_KG[food] ?? 0.3;
    weightKg = Number((quantity * perServing).toFixed(3));
  }

  const emissions_kg = Number((weightKg * perKg).toFixed(2));
  return { food, quantity, unit, weight_kg: weightKg, emissions_kg, factor_kg_per_kg: perKg };
}

function calculateWaste(args: { quantity?: number; unit?: string }): ToolResult {
  const quantity = Number(args.quantity ?? 0);
  const unit = (args.unit ?? "").toLowerCase().trim();
  if (quantity <= 0) return { error: "Quantity must be a positive number." };
  if (unit === "kg") {
    const emissions_kg = Number((quantity * WASTE_FACTOR_KG_PER_KG).toFixed(2));
    return { quantity, unit, emissions_kg, factor_kg_per_kg: WASTE_FACTOR_KG_PER_KG };
  }
  if (unit === "items" || unit === "item") {
    const emissions_kg = Number((quantity * WASTE_FACTOR_KG_PER_ITEM).toFixed(2));
    return { quantity, unit, emissions_kg, factor_kg_per_item: WASTE_FACTOR_KG_PER_ITEM };
  }
  return { error: "Unit must be 'kg' or 'items'." };
}

function calculateShopping(args: { item?: string; quantity?: number }): ToolResult {
  const item = (args.item ?? "").toLowerCase().trim();
  const quantity = Number(args.quantity ?? 0);
  if (quantity <= 0) return { error: "Quantity must be a positive number." };
  const factor = SHOPPING_FACTORS[item] ?? SHOPPING_FACTORS.default;
  const emissions_kg = Number((quantity * factor).toFixed(2));
  return { item, quantity, emissions_kg, factor_kg_per_item: factor };
}

async function logActivity(args: Activity): Promise<ToolResult> {
  if (!args.category || !args.label || !args.unit || args.quantity < 0 || args.emissions_kg < 0) {
    return { error: "Invalid activity values." };
  }
  const { data, error } = await supabase
    .from("carbon_activities")
    .insert({
      category: args.category,
      label: args.label,
      quantity: args.quantity,
      unit: args.unit,
      emissions_kg: args.emissions_kg,
    })
    .select()
    .single();
  if (error) return { error: "The activity could not be saved." };
  return { status: "logged", activity: data };
}

async function getSummary(): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("carbon_activities")
    .select("emissions_kg, category, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: "The activity history could not be loaded." };
  const rows = data ?? [];
  const total = Number(rows.reduce((s, r) => s + Number(r.emissions_kg), 0).toFixed(2));
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    byCategory[r.category] = Number(((byCategory[r.category] ?? 0) + Number(r.emissions_kg)).toFixed(2));
  }
  const today = new Date().toDateString();
  const todayTotal = Number(
    rows.filter((r) => new Date(r.created_at).toDateString() === today)
      .reduce((s, r) => s + Number(r.emissions_kg), 0)
      .toFixed(2)
  );
  return { period: "all logged activity", total_kg: total, today_kg: todayTotal, activity_count: rows.length, by_category: byCategory };
}

async function getRecentActivities(args: { limit?: number }): Promise<ToolResult> {
  const limit = Math.min(Math.max(Number(args.limit ?? 10), 1), 50);
  const { data, error } = await supabase
    .from("carbon_activities")
    .select("id, category, label, quantity, unit, emissions_kg, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { error: "Recent activities could not be loaded." };
  return { activities: data ?? [] };
}

async function suggestReductions(args: { category?: string }): Promise<ToolResult> {
  const category = (args.category ?? "").toLowerCase().trim();
  const allSuggestions = [
    { category: "travel", action: "Take the bus or train instead of driving", estimated_saving_kg: 0.89, detail: "A 10 km bus trip emits ~1.0 kg vs ~1.9 kg by car — public transport cuts emissions nearly in half (DEFRA 2024)." },
    { category: "travel", action: "Bike or walk for trips under 3 km", estimated_saving_kg: 0.58, detail: "A 3 km car trip emits ~0.58 kg CO₂e; biking or walking produces zero." },
    { category: "travel", action: "Combine errands into one trip", estimated_saving_kg: 0.80, detail: "Fewer trips means fewer cold starts and less total distance." },
    { category: "electricity", action: "Set your AC to 26°C instead of 22°C", estimated_saving_kg: 0.59, detail: "Each degree higher saves roughly 6–8% on cooling energy — 4°C difference saves ~0.59 kg/day (1.5 kW AC, 4 hrs)." },
    { category: "electricity", action: "Use a ceiling fan instead of AC when possible", estimated_saving_kg: 1.1, detail: "A ceiling fan uses 0.075 kW vs 1.5 kW for AC — 20× less power. 4 hrs of AC = 2.46 kg; fan = 0.12 kg." },
    { category: "electricity", action: "Switch to LED bulbs", estimated_saving_kg: 0.27, detail: "LEDs use 75% less energy than incandescent — a 60W bulb swapped for a 9W LED saves ~0.02 kg/hr." },
    { category: "electricity", action: "Unplug devices on standby", estimated_saving_kg: 0.18, detail: "Standby power can account for 5–10% of household electricity." },
    { category: "electricity", action: "Air-dry clothes instead of using a dryer", estimated_saving_kg: 1.23, detail: "A single dryer cycle (3 kW × 1 hr) emits ~1.23 kg CO₂e (IEA 2023 grid factor)." },
    { category: "food", action: "Swap one beef meal for a plant-based meal", estimated_saving_kg: 11.5, detail: "Beef produces ~49.5 kg CO₂e/kg vs ~1.0 kg for vegan meals (Poore & Nemecek 2018). One serving saves ~11.5 kg." },
    { category: "food", action: "Have a meatless day each week", estimated_saving_kg: 4.6, detail: "One vegetarian day per week can save ~240 kg CO₂e per year." },
    { category: "food", action: "Reduce dairy by switching to plant milk", estimated_saving_kg: 0.46, detail: "Oat milk produces ~0.9 kg CO₂e/kg vs 3.2 kg for cow's milk — a 200 ml glass saves ~0.46 kg." },
    { category: "food", action: "Plan meals to avoid food waste", estimated_saving_kg: 0.77, detail: "About one-third of food produced is wasted. Composting 1 kg of scraps instead of landfilling saves ~0.77 kg CO₂e." },
    { category: "waste", action: "Compost food scraps instead of landfill", estimated_saving_kg: 0.77, detail: "Composting avoids methane emissions — landfilling 1 kg mixed waste emits ~2.21 kg CO₂e (EPA WARM)." },
    { category: "waste", action: "Use a reusable water bottle", estimated_saving_kg: 0.022, detail: "A single plastic bottle produces ~0.022 kg CO₂e to manufacture and transport." },
    { category: "waste", action: "Carry reusable shopping bags", estimated_saving_kg: 0.04, detail: "A plastic bag produces ~0.04 kg CO₂e; reusable bags offset their impact after ~10 uses." },
    { category: "shopping", action: "Buy second-hand clothing", estimated_saving_kg: 8.0, detail: "Producing a new cotton t-shirt emits ~8 kg CO₂e (MIT LCA); second-hand avoids nearly all of that." },
    { category: "shopping", action: "Keep your phone 1 extra year", estimated_saving_kg: 75.0, detail: "Manufacturing a smartphone emits ~75 kg CO₂e (Apple ESG report); keeping it one extra year avoids that impact." },
    { category: "shopping", action: "Buy durable, repairable items", estimated_saving_kg: 10.0, detail: "Longer-lasting products spread manufacturing emissions over more years." },
  ];
  const filtered = category
    ? allSuggestions.filter((s) => s.category === category)
    : allSuggestions;
  return { suggestions: filtered.length > 0 ? filtered : allSuggestions };
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────
async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "calculate_travel_emissions":
      return calculateTravel(args as { mode?: string; km?: number });
    case "calculate_electricity_emissions":
      return calculateElectricity(args as { appliance?: string; hours?: number });
    case "calculate_food_emissions":
      return calculateFood(args as { food?: string; quantity?: number; unit?: string });
    case "calculate_waste_emissions":
      return calculateWaste(args as { quantity?: number; unit?: string });
    case "calculate_shopping_emissions":
      return calculateShopping(args as { item?: string; quantity?: number });
    case "log_activity":
      return await logActivity(args as Activity);
    case "get_summary":
      return await getSummary();
    case "get_recent_activities":
      return await getRecentActivities(args as { limit?: number });
    case "suggest_reductions":
      return await suggestReductions(args as { category?: string });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── System instruction ───────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are Carbon Coach, a friendly, encouraging personal carbon footprint assistant.

Your role:
- Understand plain-language descriptions of daily activities (travel, electricity use, food, waste, shopping).
- ALWAYS call the appropriate calculation tool before quoting any emission number.
- After calculating, call log_activity to persist each activity with the EXACT emissions_kg returned by the calculator. Never round or invent numbers.
- For multi-activity messages (e.g., "I took a bus 12 km and used my fan for 5 hours"), detect each activity separately, calculate each one, and log each one as a distinct entry.
- Ceiling fans ("fan") use a much lower power factor than AC — always pass "fan" not "ac" for ceiling fan hours.
- When the user asks for a summary, call get_summary.
- When the user asks for tips or suggestions, call suggest_reductions (optionally with a category if they specify one).
- When the user asks what they've logged, call get_recent_activities.

Emission factor sources (real-world data):
- Travel: UK DEFRA 2024 GHG Conversion Factors (per passenger-km)
- Electricity: IEA 2023 global grid average (0.41 kg CO₂e/kWh)
- Food: Our World in Data / Poore & Nemecek 2018 (per kg of product)
- Waste: EPA WARM model (per kg landfilled)
- Shopping: Various LCA studies (MIT, Apple ESG, Dell, Levi's)

Your tone:
- Coach-like, encouraging, clear. Focus on empowerment, not guilt.
- Translate abstract numbers into relatable comparisons when helpful (e.g., "that's roughly the CO₂ from charging 200 phones").
- Be concise — a few sentences, not a paragraph. Use numbers from the tools only.
- After logging, confirm what was logged with the exact kg CO₂e. If the user logged multiple activities, show each briefly and the total.

Rules:
- NEVER state an emissions number you did not get from a tool call.
- NEVER skip the calculator — even for estimates, use a tool.
- If a tool returns an error, explain it simply to the user and suggest how to fix the input.
- Keep responses to 2–4 sentences for simple logs; slightly longer only for summaries or tip lists.`;

// ─── Request handler ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json() as { message?: unknown; history?: Array<{ role: string; content: string }> };
    const apiKey = Deno.env.get("GOOGLE_API_KEY");

    if (typeof body.message !== "string" || !body.message.trim()) {
      return new Response(JSON.stringify({ error: "A message is required." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "The Gemini agent is not configured yet. Add GOOGLE_API_KEY as a secret." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation contents — include prior history if provided
    const contents: Array<Record<string, unknown>> = [];

    // Add conversation history (prior turns)
    if (Array.isArray(body.history)) {
      for (const turn of body.history) {
        if (turn && typeof turn.role === "string" && typeof turn.content === "string" && turn.content.trim()) {
          contents.push({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] });
        }
      }
    }

    // Add current user message
    contents.push({ role: "user", parts: [{ text: body.message }] });

    const loggedActivities: Activity[] = [];
    let finalText = "I couldn't complete that request.";
    let toolCallCount = 0;
    const MAX_ATTEMPTS = 8;

    const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let modelIndex = 0;

    async function geminiRequest(model: string): Promise<Response> {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents,
            tools: toolDeclarations,
            generationConfig: { temperature: 0.15 },
          }),
        }
      );
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      let response = await geminiRequest(GEMINI_MODELS[modelIndex]);

      if (response.status === 503 || response.status === 429) {
        const errBody = await response.text().catch(() => "");
        let switched = false;
        for (let m = modelIndex + 1; m < GEMINI_MODELS.length; m++) {
          modelIndex = m;
          response = await geminiRequest(GEMINI_MODELS[modelIndex]);
          if (response.ok || (response.status !== 503 && response.status !== 429)) break;
          switched = true;
        }
        if (!response.ok) {
          throw new Error(`All Gemini models are busy right now. Please try again in a moment. (${response.status}) ${errBody}`);
        }
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Gemini request failed (${response.status}). ${errText}`);
      }

      const result = await response.json() as {
        candidates?: Array<{ content?: { role?: string; parts?: Array<Record<string, unknown>> }; finishReason?: string }>;
      };

      const parts = result.candidates?.[0]?.content?.parts ?? [];
      const calls = parts.filter((part) => typeof part.functionCall === "object") as Array<{
        functionCall: { name: string; args?: Record<string, unknown> };
      }>;

      if (calls.length === 0) {
        finalText = parts
          .map((part) => (typeof part.text === "string" ? part.text : ""))
          .join("")
          .trim() || finalText;
        break;
      }

      // Track tool calls to prevent infinite loops
      toolCallCount += calls.length;
      if (toolCallCount > 15) {
        finalText = "I've processed several calculations. Here's what I found so far.";
        break;
      }

      contents.push({ role: "model", parts });

      const functionResponses = [];
      for (const call of calls) {
        const toolResult = await runTool(call.functionCall.name, call.functionCall.args ?? {});
        // Track successfully logged activities
        if (call.functionCall.name === "log_activity" && "activity" in toolResult && toolResult.activity) {
          loggedActivities.push(call.functionCall.args as Activity);
        }
        functionResponses.push({
          functionResponse: { name: call.functionCall.name, response: toolResult },
        });
      }

      contents.push({ role: "user", parts: functionResponses });
    }

    return new Response(JSON.stringify({ message: finalText, activities: loggedActivities }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent request failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
