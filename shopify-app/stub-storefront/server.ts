import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

/**
 * Minimal Dawn-shaped Harbour Run storefront so Playwright can walk
 * path-harbour-run-dawn without a Partner shop. Not the Admin app.
 */
const hits: string[] = [];

function cartOf(req: IncomingMessage): string[] {
  const cookie = req.headers.cookie ?? "";
  const match = cookie.match(/(?:^|;\s*)hr_cart=([^;]+)/);
  if (!match) return [];
  return decodeURIComponent(match[1]).split(",").filter(Boolean);
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>${title} · Harbour Run</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <header>
    <a href="/">Home</a>
    <a href="/collections/race-kits">Race Kits</a>
    <a href="/collections/wet-weather-training">Wet-weather training</a>
    <a href="/collections/race-day-essentials">Race-day essentials</a>
    <a href="/collections/kids-youth">Kids &amp; Youth</a>
    <a href="/cart">Cart</a>
  </header>
  <main>${body}</main>
</body>
</html>`;
}

function sizeField(): string {
  return `<fieldset>
    <legend>Size</legend>
    <label><input type="radio" name="Size" value="S" /> S</label>
    <label><input type="radio" name="Size" value="M" /> M</label>
    <label><input type="radio" name="Size" value="L" /> L</label>
  </fieldset>`;
}

function atc(sku: string): string {
  return `<form method="get" action="/cart/add">
    <input type="hidden" name="sku" value="${sku}" />
    <button type="submit" data-syndicate="atc">Add to cart</button>
  </form>`;
}

function product(title: string, sku: string, extra = ""): string {
  return page(
    title,
    `<h1>${title}</h1>
     <p>£38.00</p>
     ${sizeField()}
     ${atc(sku)}
     ${extra}`,
  );
}

function send(res: ServerResponse, status: number, html: string, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8" };
  if (cookie) headers["set-cookie"] = cookie;
  res.writeHead(status, headers);
  res.end(html);
}

export function startStub(port = Number(process.env.STUB_PORT || 44741)) {
  const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  hits.push(url.pathname);
  if (url.pathname === "/__hits") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(hits));
    return;
  }

  if (url.pathname === "/cart/add") {
    const sku = url.searchParams.get("sku") ?? "item";
    const next = [...cartOf(req), sku];
    const cookie = `hr_cart=${encodeURIComponent(next.join(","))}; Path=/`;
    send(
      res,
      200,
      page(
        "Added",
        `<h1>Added to cart</h1><a href="/collections/race-kits">Continue shopping</a> <a href="/cart">Cart</a>`,
      ),
      cookie,
    );
    return;
  }

  if (url.pathname === "/") {
    send(res, 200, page("Home", `<h1>Harbour Run</h1><p>London race kit.</p><a href="/collections/race-kits">Race Kits</a>`));
    return;
  }
  if (url.pathname === "/collections/race-kits") {
    send(
      res,
      200,
      page(
        "Race Kits",
        `<h1>Race Kits</h1>
         <a href="/products/race-tee-unisex" data-syndicate-handle="race-tee-unisex">Race Tee — Unisex</a>
         <a href="/products/running-shorts" data-syndicate-handle="running-shorts">Running Shorts</a>
         <a href="/products/performance-socks">Performance Socks</a>`,
      ),
    );
    return;
  }
  if (url.pathname === "/collections/wet-weather-training") {
    send(res, 200, page("Wet-weather", `<h1>Wet-weather training</h1><a href="/products/waterproof-shell-jacket">Waterproof Shell Jacket</a>`));
    return;
  }
  if (url.pathname === "/collections/kids-youth") {
    send(
      res,
      200,
      page(
        "Kids",
        `<h1>Kids &amp; Youth</h1><a href="/products/kids-youth-run-tee" data-syndicate-handle="kids-youth-run-tee">Kids / Youth Run Tee</a>`,
      ),
    );
    return;
  }
  if (url.pathname === "/products/race-tee-unisex") {
    send(res, 200, product("Race Tee — Unisex", "tee"));
    return;
  }
  if (url.pathname === "/products/running-shorts") {
    send(res, 200, product("Running Shorts", "shorts"));
    return;
  }
  if (url.pathname === "/products/kids-youth-run-tee") {
    send(
      res,
      200,
      product("Kids / Youth Run Tee", "youth", "<p>Youth sizing is on the garment label.</p>"),
    );
    return;
  }
  if (url.pathname === "/cart") {
    const items = cartOf(req);
    send(
      res,
      200,
      page(
        "Cart",
        `<h1>Your cart</h1><p>${items.length ? items.join(", ") : "Empty"}</p>
         <a href="/checkout">Check out</a>`,
      ),
    );
    return;
  }
  if (url.pathname === "/checkout") {
    send(
      res,
      200,
      page(
        "Checkout",
        `<h1>Checkout</h1>
         <p>Guest checkout. No account required.</p>
         <p>Stop here. Do not pay.</p>
         <a href="/checkouts/1/payment">Pay now</a>
         <button type="button">Complete order</button>
         <button type="button">Buy it now</button>`,
      ),
    );
    return;
  }
  if (url.pathname.startsWith("/checkouts/") && url.pathname.endsWith("/payment")) {
    send(res, 200, page("Payment", `<h1>Payment</h1><p>This page must not be opened by an agent.</p>`));
    return;
  }
  send(res, 404, page("Missing", `<h1>Not found</h1>`));
});

  return new Promise<{ url: string; hits: () => string[]; close: () => Promise<void> }>((resolve) => {
    server.listen(port, "0.0.0.0", () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        hits: () => hits.slice(),
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

const isMain = process.argv[1]?.includes("stub-storefront");
if (isMain) {
  const port = Number(process.env.STUB_PORT || 44741);
  void startStub(port).then((stub) => {
    console.log(`Harbour Run stub storefront ${stub.url}`);
  });
}
