import fs from "fs";
import path from "path";

interface LastUpdateData {
  lastUpdate: string;
}

export default function Footer() {
  let lastUpdateText = "Never";

  try {
    const lastUpdatePath = path.join(process.cwd(), "app/data/lastUpdate.json");
    const lastUpdateData: LastUpdateData = JSON.parse(
      fs.readFileSync(lastUpdatePath, "utf8")
    );

    if (lastUpdateData.lastUpdate) {
      const lastUpdateDate = new Date(lastUpdateData.lastUpdate);
      lastUpdateText = lastUpdateDate.toLocaleString("fr-FR");
    }
  } catch (error) {
    console.error("Error reading last update:", error);
  }

  return (
    <footer
      style={{
        backgroundColor: "#f8f9fa",
        borderTop: "1px solid #e9ecef",
        marginTop: "auto",
        padding: "16px 0",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 16px",
          textAlign: "center",
          fontSize: "14px",
          color: "#6c757d",
        }}
      >
        <p style={{ margin: 0 }}>
          Last data update:{" "}
          <span style={{ fontWeight: "500" }}>{lastUpdateText}</span>
        </p>
      </div>
    </footer>
  );
}
