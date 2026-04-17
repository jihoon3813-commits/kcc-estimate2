import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function fix() {
    console.log("Fixing template type...");
    const templates = await client.query(api.templates.listTemplates);
    const target = templates.find(t => t.name === "그린리모델링 신청서(은행대출용)");
    if (target) {
        console.log("Found target, updating type to green_remodeling...");
        await client.mutation(api.templates.saveTemplate, {
            id: target._id,
            name: target.name,
            type: "green_remodeling",
            storageId: target.storageId,
            fields: target.fields
        });
        console.log("Done.");
    } else {
        console.log("Target template not found.");
    }
}

fix();
