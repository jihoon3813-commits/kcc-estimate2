import { api } from "./convex/_generated/api.js";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.VITE_CONVEX_URL);

async function checkQuotes() {
    try {
        const quotes = await convex.query(api.quotes.listQuotes);
        console.log("Total quotes:", quotes.length);
        if (quotes.length > 0) {
            console.log("First quote sample:", JSON.stringify(quotes[0], null, 2));
        }
    } catch (e) {
        console.error("Query failed:", e);
    }
}

checkQuotes();
