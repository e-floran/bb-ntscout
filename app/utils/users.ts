import { User } from "../types/mainTypes";
import { UserRoles } from "../types/types";

export const users: User[] = [
  {
    login: "Atlantitan",
    mainTeamId: "1011",
    active: true,
    role: UserRoles.Admin,
  },
  {
    login: "gpolin",
    mainTeamId: "11",
    active: true,
    role: UserRoles.User,
  },
  {
    login: "Walter Sobchak",
    mainTeamId: "50",
    active: true,
    role: UserRoles.Staff,
  },
  {
    login: "Squall_L81",
    mainTeamId: "11",
    active: true,
    role: UserRoles.Admin,
  },
  {
    login: "Boulfe",
    mainTeamId: "1011",
    active: true,
    role: UserRoles.Staff,
  },
  {
    login: "Smidge",
    mainTeamId: "11",
    active: true,
    role: UserRoles.User,
  },
  {
    login: "slamdunk9",
    mainTeamId: "11",
    active: true,
    role: UserRoles.User,
  },
  {
    login: "Charlypeartree71",
    mainTeamId: "1011",
    active: true,
    role: UserRoles.Coach,
  },
  {
    login: "chavarinho42",
    mainTeamId: "1011",
    active: true,
    role: UserRoles.Staff,
  },
  {
    login: "sbooby",
    mainTeamId: "11",
    active: true,
    role: UserRoles.Coach,
  },
];
