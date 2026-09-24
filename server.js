import http from "node:http";

const PORT = Number(process.env.PORT || 3000);

const BINANCE_WEB3_HEADERS = {
  "User-Agent": "binance-web3/2.0 (Skill)",
  "Accept-Encoding": "identity",
  "Content-Type": "application/json",
  Accept: "application/json"
};

async function testGet(name, url, headers = {}) {
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(15000)
    });

    return {
      name,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - started
    };
  } catch (error) {
    return {
      name,
      status: null,
      ok: false,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testPost(name, url, body, headers = {}) {
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(15000)
    });

    return {
      name,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - started
    };
  } catch (error) {
    return {
      name,
      status: null,
      ok: false,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runTests() {
  const alphaExchangeInfo =
    "https://www.binance.com/bapi/defi/v1/public/alpha-trade/get-exchange-info";

  
  const smartMoney =
    "https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai";

  const results = [];

  results.push(
    await testGet(
      "Binance Alpha exchange-info",
      alphaExchangeInfo,
      {
        Accept: "application/json"
      }
    )
  );

  results.push(
    await testPost(
      "Binance Smart Money BSC",
      smartMoney,
      {
        chainId: "56",
        page: 1,
        pageSize: 100
      },
      BINANCE_WEB3_HEADERS
    )
  );

  results.push(
    await testPost(
      "Binance Smart Money Solana",
      smartMoney,
      {
        chainId: "CT_501",
        page: 1,
        pageSize: 100
      },
      BINANCE_WEB3_HEADERS
    )
  );

  return {
    environment: "binance-bridge-test",
    timestamp: new Date().toISOString(),
    results
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.url === "/health") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        status: "ok",
        service: "binance-bridge-test"
      })
    );
    return;
  }

  if (req.url === "/test/binance") {
    try {
      const result = await runTests();

      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.writeHead(500);
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        })
      );
    }

    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Binance bridge test listening on port ${PORT}`);
});