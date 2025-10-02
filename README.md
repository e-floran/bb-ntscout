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

## Basic app workflow

- a user must login on the login page. the users table, containing a list of authorized users, is checked before sending a login request to the bbapi.
- on login, the user is redirected to the index.

## Analyze team

- on the analyze page, data is fetched on the user main national team next opponent.
- the user can then pick another team to analyze on this same page.
- several collapsable section display data in tables. Data is either fetched from the bbapi or retrieved from the app database.

## Manual scouting

- base workflow retrieve data with automated API calls. But users with sufficient rights can add players manually on the scouting page.

## Stored data

- the data is stored in a database. Tables schemas can be found in the app/utils/database folder.

## Scripts

- in the scripts folder, scripts have bben created to fetch data that must be fetched each week : gameshape and dmi
- update-players-data.ts get all players from the games played by all national teams this season
- checkNewPlayers.ts is intended to be used after national teams games on monday, to check all national teams last game and see if there are new players to add
- fridayScript.ts add a new entry for each player in the player_weeks table.
- fetch-players-bbapi.ts use another API of Buzzerbeater to get complete players profiles if they are on the transfer market at the time of the script and save it in the scoutings table.
