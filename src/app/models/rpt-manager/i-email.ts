import { Parameter } from "./i-parameter";

export interface Email {
    Subject: string;
    Body: string;
    Recipients: string[];
    Parameters: Parameter[];
}