export type EconomicEventContentTemplate = {
  title: string;
  keywords: string[];
  description: string;
  whyItMatters: string;
  impact: {
    bullish: string;
    bearish: string;
  };
  behavior: string;
  instruments: string[];
};

export const ECONOMIC_EVENT_CONTENT: Record<string, EconomicEventContentTemplate> = {
  "CORE CPI": {
    title: "CORE CPI",
    keywords: ["Core CPI"],
    description: "Inflation excluding food and energy prices.",
    whyItMatters: "Central banks focus heavily on core inflation.",
    impact: {
      bullish: "Higher → currency strengthens",
      bearish: "Lower → currency weakens",
    },
    behavior: "Very strong reaction, often bigger than CPI.",
    instruments: ["USD pairs", "XAUUSD"],
  },
  "CORE PCE": {
    title: "CORE PCE",
    keywords: ["PCE"],
    description: "Fed’s preferred inflation measure.",
    whyItMatters: "Directly affects Fed policy.",
    impact: {
      bullish: "Higher → USD strengthens",
      bearish: "Lower → USD weakens",
    },
    behavior: "Strong USD reactions.",
    instruments: ["XAUUSD", "USD pairs"],
  },
  "CENTRAL BANK MINUTES": {
    title: "CENTRAL BANK MINUTES",
    keywords: ["Minutes"],
    description: "Detailed policy meeting notes.",
    whyItMatters: "Reveals central bank thinking.",
    impact: {
      bullish: "Hawkish → currency strengthens",
      bearish: "Dovish → currency weakens",
    },
    behavior: "Gradual moves.",
    instruments: ["USD pairs"],
  },
  FOMC: {
    title: "FOMC",
    keywords: ["FOMC"],
    description: "Federal Reserve policy decision and statement.",
    whyItMatters: "Guides future interest rates.",
    impact: {
      bullish: "Hawkish → USD strengthens",
      bearish: "Dovish → USD weakens",
    },
    behavior: "Massive volatility and whipsaws.",
    instruments: ["XAUUSD", "USD pairs"],
  },
  "FED SPEECH": {
    title: "FED SPEECH",
    keywords: ["Powell", "Fed Speaks", "Chair"],
    description: "Speech by central bank leader.",
    whyItMatters: "Hints future policy direction.",
    impact: {
      bullish: "Hawkish tone → currency strengthens",
      bearish: "Dovish tone → currency weakens",
    },
    behavior: "Unpredictable spikes.",
    instruments: ["USD pairs", "Gold"],
  },
  "INTEREST RATE": {
    title: "INTEREST RATE",
    keywords: ["Interest Rate", "Rate Decision"],
    description: "Central bank sets borrowing rates.",
    whyItMatters: "Controls money flow and currency value.",
    impact: {
      bullish: "Rate hike → currency strengthens",
      bearish: "Rate cut → currency weakens",
    },
    behavior: "Major moves, can shift trends.",
    instruments: ["All pairs", "Gold", "Indices"],
  },
  CPI: {
    title: "CPI",
    keywords: ["CPI", "Consumer Price Index"],
    description: "Measures inflation by tracking price changes of goods and services.",
    whyItMatters: "Inflation drives central bank decisions on interest rates.",
    impact: {
      bullish: "Higher than expected → currency strengthens",
      bearish: "Lower than expected → currency weakens",
    },
    behavior: "High volatility, sharp spikes, strong reaction in USD and gold.",
    instruments: ["XAUUSD", "EURUSD", "GBPUSD", "USD pairs"],
  },
  NFP: {
    title: "NFP",
    keywords: ["Non-Farm", "NFP"],
    description: "Measures number of jobs added to the economy.",
    whyItMatters: "Shows strength of the labor market.",
    impact: {
      bullish: "More jobs → currency strengthens",
      bearish: "Fewer jobs → currency weakens",
    },
    behavior: "Extreme volatility, fast spikes, fakeouts common.",
    instruments: ["XAUUSD", "EURUSD", "GBPUSD", "Indices"],
  },
  "UNEMPLOYMENT RATE": {
    title: "UNEMPLOYMENT RATE",
    keywords: ["Unemployment"],
    description: "Percentage of people unemployed.",
    whyItMatters: "Indicates economic strength.",
    impact: {
      bullish: "Lower → currency strengthens",
      bearish: "Higher → currency weakens",
    },
    behavior: "Strong reaction if deviation is large.",
    instruments: ["USD pairs", "EUR pairs"],
  },
  GDP: {
    title: "GDP",
    keywords: ["GDP"],
    description: "Measures total economic growth.",
    whyItMatters: "Indicates overall economic health.",
    impact: {
      bullish: "Strong growth → currency strengthens",
      bearish: "Weak growth → currency weakens",
    },
    behavior: "Moderate to strong moves.",
    instruments: ["Major pairs"],
  },
  "RETAIL SALES": {
    title: "RETAIL SALES",
    keywords: ["Retail Sales"],
    description: "Measures consumer spending.",
    whyItMatters: "Spending drives economic growth.",
    impact: {
      bullish: "Higher → currency strengthens",
      bearish: "Lower → currency weakens",
    },
    behavior: "Good volatility.",
    instruments: ["USD pairs"],
  },
  PMI: {
    title: "PMI",
    keywords: ["PMI"],
    description: "Measures business activity.",
    whyItMatters: "Early economic indicator.",
    impact: {
      bullish: "Above forecast → currency strengthens",
      bearish: "Below forecast → currency weakens",
    },
    behavior: "Quick intraday moves.",
    instruments: ["EURUSD", "GBPUSD"],
  },
  ISM: {
    title: "ISM",
    keywords: ["ISM"],
    description: "Business condition survey.",
    whyItMatters: "Strong economic indicator.",
    impact: {
      bullish: "Above forecast → currency strengthens",
      bearish: "Below forecast → currency weakens",
    },
    behavior: "Strong intraday moves.",
    instruments: ["USD pairs"],
  },
  PPI: {
    title: "PPI",
    keywords: ["PPI"],
    description: "Measures inflation at producer level.",
    whyItMatters: "Leads consumer inflation.",
    impact: {
      bullish: "Higher → currency strengthens",
      bearish: "Lower → currency weakens",
    },
    behavior: "Moderate moves.",
    instruments: ["USD pairs"],
  },
  "TRADE BALANCE": {
    title: "TRADE BALANCE",
    keywords: ["Trade Balance"],
    description: "Difference between exports and imports.",
    whyItMatters: "Affects currency demand.",
    impact: {
      bullish: "Surplus → currency strengthens",
      bearish: "Deficit → currency weakens",
    },
    behavior: "Moderate impact.",
    instruments: ["Currency pairs"],
  },
  "INDUSTRIAL PRODUCTION": {
    title: "INDUSTRIAL PRODUCTION",
    keywords: ["Industrial"],
    description: "Measures factory output.",
    whyItMatters: "Reflects economic strength.",
    impact: {
      bullish: "Higher → currency strengthens",
      bearish: "Lower → currency weakens",
    },
    behavior: "Moderate moves.",
    instruments: ["Major pairs"],
  },
  HOUSING: {
    title: "HOUSING",
    keywords: ["Housing", "Building", "Permits"],
    description: "Measures construction activity.",
    whyItMatters: "Signals economic confidence.",
    impact: {
      bullish: "Higher → currency strengthens",
      bearish: "Lower → currency weakens",
    },
    behavior: "Mild to moderate.",
    instruments: ["USD pairs"],
  },
  "CONSUMER CONFIDENCE": {
    title: "CONSUMER CONFIDENCE",
    keywords: ["Confidence"],
    description: "Measures consumer optimism.",
    whyItMatters: "Confidence drives spending.",
    impact: {
      bullish: "Higher → currency strengthens",
      bearish: "Lower → currency weakens",
    },
    behavior: "Short-term moves.",
    instruments: ["USD pairs"],
  },
  "JOBLESS CLAIMS": {
    title: "JOBLESS CLAIMS",
    keywords: ["Jobless"],
    description: "Weekly unemployment claims.",
    whyItMatters: "Shows labor market health.",
    impact: {
      bullish: "Lower → currency strengthens",
      bearish: "Higher → currency weakens",
    },
    behavior: "Quick reactions.",
    instruments: ["USD pairs"],
  },
  "INFLATION EXPECTATIONS": {
    title: "INFLATION EXPECTATIONS",
    keywords: ["Expectations"],
    description: "Forecast of future inflation.",
    whyItMatters: "Drives long-term rate outlook.",
    impact: {
      bullish: "Rising → currency strengthens",
      bearish: "Falling → currency weakens",
    },
    behavior: "Slow trend impact.",
    instruments: ["USD pairs"],
  },
};

export const GENERIC_ECONOMIC_EVENT_CONTENT: EconomicEventContentTemplate = {
  title: "Economic Event",
  keywords: [],
  description: "Scheduled macro release or policy event.",
  whyItMatters: "Surprises can shift rate expectations and short-term volatility.",
  impact: {
    bullish: "Stronger than expected → currency may strengthen",
    bearish: "Weaker than expected → currency may weaken",
  },
  behavior: "Watch for volatility near the release time.",
  instruments: ["Related currency pairs", "Gold", "Indices"],
};
