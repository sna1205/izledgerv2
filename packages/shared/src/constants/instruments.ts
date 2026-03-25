export type InstrumentCategory = "Forex" | "Metals" | "Crypto" | "Indices" | "Commodities" | "Stocks";

export interface InstrumentDefinition {
  value: string;
  label: string;
  name?: string;
  category: InstrumentCategory;
  keywords: string[];
  pipSize?: number;
  pipValue?: number;
}

export interface InstrumentCategoryGroup {
  category: InstrumentCategory;
  items: InstrumentDefinition[];
}

function createInstrument(
  category: InstrumentCategory,
  value: string,
  keywords: string[],
  pipConfig?: { pipSize: number; pipValue: number },
  name?: string,
): InstrumentDefinition {
  return {
    value,
    label: value,
    name,
    category,
    keywords,
    ...pipConfig,
  };
}

export const INSTRUMENT_GROUPS: InstrumentCategoryGroup[] = [
  {
    category: "Forex",
    items: [
      createInstrument("Forex", "EURUSD", ["eurusd", "euro", "usd", "dollar", "forex", "major"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "GBPUSD", ["gbpusd", "pound", "sterling", "usd", "dollar", "forex", "major"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "USDJPY", ["usdjpy", "usd", "jpy", "yen", "dollar", "forex", "major"], { pipSize: 0.01, pipValue: 10 }),
      createInstrument("Forex", "USDCHF", ["usdchf", "usd", "chf", "swiss franc", "franc", "forex"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "USDCAD", ["usdcad", "usd", "cad", "canadian dollar", "loonie", "forex"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "AUDUSD", ["audusd", "aud", "australian dollar", "aussie", "usd", "forex"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "NZDUSD", ["nzdusd", "nzd", "new zealand dollar", "kiwi", "usd", "forex"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "EURJPY", ["eurjpy", "euro", "jpy", "yen", "forex", "cross"], { pipSize: 0.01, pipValue: 10 }),
      createInstrument("Forex", "GBPJPY", ["gbpjpy", "pound", "jpy", "yen", "forex", "cross"], { pipSize: 0.01, pipValue: 10 }),
      createInstrument("Forex", "EURGBP", ["eurgbp", "euro", "pound", "sterling", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "EURCHF", ["eurchf", "euro", "chf", "franc", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "EURNZD", ["eurnzd", "euro", "nzd", "kiwi", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "EURAUD", ["euraud", "euro", "aud", "aussie", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "GBPAUD", ["gbpaud", "pound", "aud", "aussie", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "GBPCAD", ["gbpcad", "pound", "cad", "loonie", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "GBPCHF", ["gbpchf", "pound", "chf", "franc", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "AUDJPY", ["audjpy", "aud", "jpy", "yen", "aussie", "forex", "cross"], { pipSize: 0.01, pipValue: 10 }),
      createInstrument("Forex", "AUDCAD", ["audcad", "aud", "cad", "aussie", "loonie", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "AUDCHF", ["audchf", "aud", "chf", "aussie", "franc", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "NZDJPY", ["nzdjpy", "nzd", "jpy", "kiwi", "yen", "forex", "cross"], { pipSize: 0.01, pipValue: 10 }),
      createInstrument("Forex", "NZDCAD", ["nzdcad", "nzd", "cad", "kiwi", "loonie", "forex", "cross"], { pipSize: 0.0001, pipValue: 10 }),
      createInstrument("Forex", "CADJPY", ["cadjpy", "cad", "jpy", "loonie", "yen", "forex", "cross"], { pipSize: 0.01, pipValue: 10 }),
      createInstrument("Forex", "CHFJPY", ["chfjpy", "chf", "jpy", "franc", "yen", "forex", "cross"], { pipSize: 0.01, pipValue: 10 }),
    ],
  },
  {
    category: "Metals",
    items: [
      createInstrument("Metals", "XAUUSD", ["xauusd", "gold", "bullion", "metal", "precious metal"], { pipSize: 0.1, pipValue: 10 }, "Gold"),
      createInstrument("Metals", "XAGUSD", ["xagusd", "silver", "metal", "precious metal"], { pipSize: 0.01, pipValue: 5 }, "Silver"),
    ],
  },
  {
    category: "Crypto",
    items: [
      createInstrument("Crypto", "BTCUSD", ["btcusd", "btc", "bitcoin", "crypto", "digital asset"], { pipSize: 1, pipValue: 1 }, "Bitcoin"),
      createInstrument("Crypto", "ETHUSD", ["ethusd", "eth", "ethereum", "crypto", "digital asset"], { pipSize: 0.1, pipValue: 1 }, "Ethereum"),
      createInstrument("Crypto", "SOLUSD", ["solusd", "sol", "solana", "crypto", "digital asset"], { pipSize: 0.01, pipValue: 1 }, "Solana"),
      createInstrument("Crypto", "XRPUSD", ["xrpusd", "xrp", "ripple", "crypto", "digital asset"], { pipSize: 0.0001, pipValue: 1 }, "XRP"),
      createInstrument("Crypto", "BNBUSD", ["bnbusd", "bnb", "binance coin", "crypto", "digital asset"], { pipSize: 0.01, pipValue: 1 }, "BNB"),
      createInstrument("Crypto", "ADAUSD", ["adausd", "ada", "cardano", "crypto", "digital asset"], { pipSize: 0.0001, pipValue: 1 }, "Cardano"),
    ],
  },
  {
    category: "Indices",
    items: [
      createInstrument("Indices", "US30", ["us30", "dow", "dow jones", "djia", "index", "indices"], { pipSize: 1, pipValue: 1 }, "Dow Jones"),
      createInstrument("Indices", "NAS100", ["nas100", "nasdaq", "nasdaq 100", "tech index", "index", "indices"], { pipSize: 0.1, pipValue: 1 }, "Nasdaq 100"),
      createInstrument("Indices", "SPX500", ["spx500", "sp500", "s&p 500", "s and p", "index", "indices"], { pipSize: 0.1, pipValue: 1 }, "S&P 500"),
      createInstrument("Indices", "GER40", ["ger40", "dax", "germany 40", "index", "indices"], { pipSize: 1, pipValue: 1 }, "DAX 40"),
      createInstrument("Indices", "UK100", ["uk100", "ftse", "ftse 100", "london index", "index", "indices"], { pipSize: 1, pipValue: 1 }, "FTSE 100"),
      createInstrument("Indices", "JP225", ["jp225", "nikkei", "nikkei 225", "japan index", "index", "indices"], { pipSize: 1, pipValue: 1 }, "Nikkei 225"),
    ],
  },
  {
    category: "Commodities",
    items: [
      createInstrument("Commodities", "WTI", ["wti", "oil", "crude", "west texas intermediate", "energy", "commodity"], { pipSize: 0.01, pipValue: 10 }, "WTI Crude"),
      createInstrument("Commodities", "BRENT", ["brent", "oil", "crude", "brent crude", "energy", "commodity"], { pipSize: 0.01, pipValue: 10 }, "Brent Crude"),
      createInstrument("Commodities", "NATGAS", ["natgas", "natural gas", "gas", "energy", "commodity"], { pipSize: 0.001, pipValue: 10 }, "Natural Gas"),
    ],
  },
];

export const INSTRUMENTS = INSTRUMENT_GROUPS.flatMap((group) => group.items);

export const INSTRUMENTS_BY_VALUE = Object.fromEntries(
  INSTRUMENTS.map((instrument) => [instrument.value, instrument]),
) as Record<string, InstrumentDefinition>;

export const PAIRS = INSTRUMENTS.map((instrument) => instrument.value);
