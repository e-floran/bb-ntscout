import fs from "fs";
import path from "path";

export function updateLastUpdateTimestamp(): void {
  try {
    const lastUpdatePath = path.join(process.cwd(), "app/data/lastUpdate.json");
    const currentTimestamp = new Date().toISOString();

    const updateData = {
      lastUpdate: currentTimestamp,
    };

    fs.writeFileSync(lastUpdatePath, JSON.stringify(updateData, null, 2));
    console.log(`Last update timestamp set to: ${currentTimestamp}`);
  } catch (error) {
    console.error("Error updating last update timestamp:", error);
  }
}
