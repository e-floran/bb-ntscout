Buzzerbeater is a basketball management game. This web app is used to fetch data from the public API bbapi to help national teams coaches to prepare their games.

## Buzzerbeater informations

- Weeks start on friday
- each week, gameshape changes
- national teams games are on monday
- club teams games are on saturday, thuesday and thursday
- training is position based. Either single position (PG, SG, SF, PF or C) or certain two-positions sets (PG-SG, SF-PF or PF-C) based. A player must play at least 48 minutes at a given position (or set) in its club team games during the week to receive a full training. Each missing minute means missing percentages of training

## BBAPI informations

- BBAPI requires login before querying any other route
- it outputs XML
- BBAPI has a short timeout and rate limit
- the app/utils/api folder contains .txt files to document the BBAPI. bbapi_docs.txt is the API full documentation other .txt files are routes output examples.

## Authentication & Authorization

### User Roles

The application implements a role-based access control system with the following roles:

- **Admin**: Full access to all features and data
- **Coach**: Access to analysis and scouting features for their team category
- **Staff**: Limited access to analysis and scouting based on team category (senior/junior)
- **Scout**: Access to scouting features and analysis for their team category
- **User**: Basic access to index page only

### Access Control

- **Index page** (`/`): Available to all authenticated users
- **Analyze page** (`/analyze`): Admin, Coach, Staff only
- **Scouting page** (`/scouting`): Admin, Coach, Staff, Scout only

### Team Category Restrictions

Staff users can only access scouted players data for teams in the same category as their assigned team:

- **Senior teams** (ID < 1000): Can access senior team scouting data
- **Junior teams** (ID ≥ 1000): Can access junior team scouting data

Admin and Coach roles have unrestricted access to all team categories.

### Login Flow

1. User credentials are validated against the database
2. BBAPI authentication is performed
3. User is redirected based on role and `is_new` status:
   - New users → Index page (to read welcome information)
   - Scouts → Scouting page
   - Admin/Coach/Staff → Analyze page
   - Users → Index page

### Authorization Implementation

- **Client-side**: Pages check user authorization and redirect unauthorized users
- **Server-side**: All API routes validate user permissions from database
- **Middleware**: Handles basic authentication and redirects unauthenticated users to login

## Basic app workflow

- a user must login on the login page. the users table, containing a list of authorized users with their assigned roles, is checked before sending a login request to the bbapi.
- on login, the user is redirected based on their role and whether they are a new user
- unauthorized users are redirected away from restricted pages

## Analyze team

- on the analyze page, data is fetched on the user main national team next opponent.
- the user can then pick another team to analyze on this same page.
- several collapsable section display data in tables. Data is either fetched from the bbapi or retrieved from the app database.
- **Access**: Admin, Coach, Staff only
- **Scouted players section**: Staff users see data filtered by team category

## Manual scouting

- base workflow retrieve data with automated API calls. But users with sufficient rights can add players manually on the scouting page.
- **Access**: Admin, Coach, Staff, Scout only
- supports both individual player scouting and batch import via copy-paste

## Stored data

- the data is stored in a database. Tables schemas can be found in the app/utils/database folder.
- the `users` table includes role-based permissions and team assignments

## Scripts

- in the scripts folder, scripts have bben created to fetch data that must be fetched each week : gameshape and dmi
- update-players-data.ts get all players from the games played by all national teams this season
- checkNewPlayers.ts is intended to be used after national teams games on monday, to check all national teams last game and see if there are new players to add
- fridayScript.ts add a new entry for each player in the player_weeks table.
- fetch-players-bbapi.ts use another API of Buzzerbeater to get complete players profiles if they are on the transfer market at the time of the script and save it in the scoutings table.

## French Players Database

- on the players page, users with sufficient rights can browse and filter French players from the database
- **Access**: Admin always has access. Coach, Scout, Staff only if their main_team_id is 11 (France senior) or 1011 (France U21)
- filters include: name, age range, potential range
- players are displayed in a full-width dashboard table with their latest scouting data
- each player row displays the most recent scouting report directly in the table
- users can create new scouting entries (existing scoutings are never updated - each submission creates a new entry)
- only French players (country_id = 11) are displayed
- only players with first_name and last_name not null are shown
