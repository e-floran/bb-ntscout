// import fs from "fs";
// import path from "path";

// export function updateLastUpdateTimestamp(): void {
//   try {
//     const lastUpdatePath = path.join(process.cwd(), "app/data/lastUpdate.json");
//     const currentTimestamp = new Date().toISOString();

//     const updateData = {
//       lastUpdate: currentTimestamp,
//     };

//     fs.writeFileSync(lastUpdatePath, JSON.stringify(updateData, null, 2));
//     console.log(`Last update timestamp set to: ${currentTimestamp}`);
//   } catch (error) {
//     console.error("Error updating last update timestamp:", error);
//   }
// }

import fs from "fs";
import path from "path";

export function updateLastUpdateTimestamp(): void {
  try {
    const lastUpdatePath = path.join(process.cwd(), "app/data/lastUpdate.json");
    const currentTimestamp = new Date().toISOString();

    console.log(`Attempting to update file at: ${lastUpdatePath}`);
    console.log(`Current working directory: ${process.cwd()}`);

    // Check if file exists and is writable
    if (fs.existsSync(lastUpdatePath)) {
      console.log("File exists, checking permissions...");
      const stats = fs.statSync(lastUpdatePath);
      console.log(`File permissions: ${stats.mode.toString(8)}`);
    } else {
      console.log("File does not exist, will create it");
    }

    const updateData = {
      lastUpdate: currentTimestamp,
    };

    fs.writeFileSync(lastUpdatePath, JSON.stringify(updateData, null, 2));
    console.log(`Last update timestamp set to: ${currentTimestamp}`);

    // Verify the file was actually updated
    const verifyData = JSON.parse(fs.readFileSync(lastUpdatePath, "utf8"));
    console.log(`Verification - file now contains: ${verifyData.lastUpdate}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error updating last update timestamp:", error);
    console.error("Error details:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}
