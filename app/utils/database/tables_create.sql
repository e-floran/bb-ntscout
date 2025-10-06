-- Create teams table
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table (simplified with team_id)
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  country_id INTEGER NOT NULL,
    potential INTEGER,
      current_age INTEGER,
  team_id INTEGER REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_weeks table
CREATE TABLE player_weeks (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  week_number INTEGER NOT NULL,
  season INTEGER NOT NULL,
  gameshape INTEGER,
  dmi INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, week_number, season)
);

-- Create scoutings table (for the scoutings array)
CREATE TABLE scoutings (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  age INTEGER,
  salary INTEGER,
  gameshape INTEGER, -- gameshape
  jump_shot INTEGER, -- jump shot
  jump_range INTEGER, -- jump range
  outside_defense INTEGER, -- outside defense
  handling INTEGER, -- handling
  driving INTEGER, -- driving
  passing INTEGER, -- passing
  inside_shot INTEGER, -- inside shot (renamed to avoid SQL keyword)
  inside_defense INTEGER, -- inside defense (renamed to avoid SQL keyword)
  rebound INTEGER, -- rebounding
  shot_blocking INTEGER, -- shot blocking
  stamina INTEGER, -- stamina
  free_throw INTEGER, -- free throw
  experience INTEGER, -- experience
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) NOT NULL UNIQUE,
    main_team_id INTEGER NOT NULL REFERENCES teams(id),
    active BOOLEAN NOT NULL DEFAULT true,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_new BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_player_weeks_player_id ON player_weeks(player_id);
CREATE INDEX idx_player_weeks_week_season ON player_weeks(week_number, season);
CREATE INDEX idx_scoutings_player_id ON scoutings(player_id);
CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_users_main_team_id ON users(main_team_id);