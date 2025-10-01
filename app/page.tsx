export default function IndexPage() {
  return (
    <div className="main-container" style={{ position: "relative" }}>
      <div
        className="form-container"
        style={{ maxWidth: "1200px", width: "100%" }}
      >
        <h2 className="form-title">Bienvenue sur BB NTscout ! 🏀</h2>

        <div
          style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
            marginBottom: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "1.1rem",
              marginBottom: "1.5rem",
              textAlign: "center",
              color: "#374151",
            }}
          >
            L&apos;outil indispensable pour les coachs et scouts d&apos;équipes
            nationales Buzzerbeater. Préparez vos matchs comme un pro et ne
            laissez plus rien au hasard ! 🎯
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
              marginTop: "2rem",
            }}
          >
            {/* Analyse Page */}
            <div
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📊 Page d&apos;Analyse
              </h3>
              <p style={{ marginBottom: "1rem", lineHeight: "1.6" }}>
                Votre arme secrète pour décortiquer l&apos;adversaire ! Analysez
                jusqu&apos;à 10 saisons d&apos;historique et découvrez :
              </p>
              <ul
                style={{
                  paddingLeft: "1.2rem",
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                }}
              >
                <li>
                  🎯 <strong>Stratégies favorites</strong> : offensives et
                  défensives
                </li>
                <li>
                  ⭐ <strong>Notes d&apos;équipe</strong> moyennes et maximales
                  par catégorie
                </li>
                <li>
                  🏃‍♂️ <strong>Efficacité par poste</strong> : où
                  l&apos;adversaire est le plus fort
                </li>
                <li>
                  📈 <strong>Stats détaillées des joueurs</strong> sur plusieurs
                  saisons
                </li>
                <li>
                  💪 <strong>Variations d&apos;effort</strong> : qui triche et
                  quand ?
                </li>
                <li>
                  📋 <strong>Historique GS/DMI</strong> de chaque joueur
                </li>
                <li>
                  🔍 <strong>Données de scouting</strong> disponibles
                </li>
              </ul>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                Filtrez par stratégies et excluez les matchs non-représentatifs
                pour une analyse au top ! 🚀
              </p>
            </div>

            {/* Scouting Page */}
            <div
              style={{
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                color: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                🔍 Page de Scouting
              </h3>
              <p style={{ marginBottom: "1rem", lineHeight: "1.6" }}>
                Pour les scouts qui ne dorment jamais ! Enrichissez la base de
                données avec :
              </p>
              <ul
                style={{
                  paddingLeft: "1.2rem",
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                }}
              >
                <li>
                  👤 <strong>Scouting manuel</strong> : joueur par joueur
                </li>
                <li>
                  📦 <strong>Scouting par groupe</strong> : collez directement
                  les profils du jeu
                </li>
                <li>
                  📊 <strong>Toutes les stats</strong> : âge, salaire, et les 16
                  compétences
                </li>
                <li>
                  🆕 <strong>Nouveaux joueurs</strong> : ajoutez ceux qui ne
                  sont pas encore dans la base
                </li>
                <li>
                  ⏰ <strong>Horodatage</strong> : gardez une trace de quand le
                  scouting a été fait
                </li>
              </ul>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                Que vous soyez coach, staff ou scout pur et dur, cette page est
                votre terrain de jeu ! 🎮
              </p>
            </div>

            {/* Automated Scripts */}
            <div
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                color: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                🤖 Scripts Automatisés
              </h3>
              <p style={{ marginBottom: "1rem", lineHeight: "1.6" }}>
                Pendant que vous dormez, nos robots travaillent ! Collecte
                automatique de :
              </p>
              <ul
                style={{
                  paddingLeft: "1.2rem",
                  lineHeight: "1.6",
                  fontSize: "0.95rem",
                }}
              >
                <li>
                  📅 <strong>Chaque vendredi</strong> : nouveau GS et DMI de
                  tous les joueurs
                </li>
                <li>
                  🏆 <strong>Après chaque journée NT</strong> : nouveaux joueurs
                  détectés
                </li>
                <li>
                  📋 <strong>Profils complets</strong> : via l&apos;API
                  transfert quand disponible
                </li>
                <li>
                  🔄 <strong>Mise à jour continue</strong> : base de données
                  toujours fraîche
                </li>
                <li>
                  ⚡ <strong>Zero effort</strong> : tout se fait tout seul !
                </li>
              </ul>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                Plus besoin de passer des heures à collecter les données,
                concentrez-vous sur la tactique ! 🧠
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
