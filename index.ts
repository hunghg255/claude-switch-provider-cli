#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createInterface } from "readline";

const KEY_JSON_PATH = join(import.meta.dir, "key.local.json");

function readKeyJson(): Record<string, Record<string, string>> {
  if (!existsSync(KEY_JSON_PATH)) {
    console.error(chalk.red(`key.json not found at ${KEY_JSON_PATH}`));
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(KEY_JSON_PATH, "utf-8"));
  } catch {
    console.error(chalk.red(`Cannot parse ${KEY_JSON_PATH}`));
    process.exit(1);
  }
}

async function promptSelect(options: string[]): Promise<string> {
  console.log(chalk.bold("\nAvailable providers:\n"));
  options.forEach((name, i) => {
    console.log(`  ${chalk.cyan(`[${i + 1}]`)} ${name}`);
  });
  console.log();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(chalk.yellow("Select provider (number): "), (answer) => {
      rl.close();
      const idx = parseInt(answer.trim(), 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= options.length) {
        console.error(chalk.red("Invalid selection."));
        process.exit(1);
      }
      resolve(options[idx]!);
    });
  });
}

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

function readSettings(): Record<string, any> {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
  } catch {
    console.error(chalk.red(`Cannot parse ${SETTINGS_PATH}`));
    process.exit(1);
  }
}

function writeSettings(settings: Record<string, any>): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

function getEnv(settings: Record<string, any>): Record<string, string> {
  return settings.env ?? {};
}

const program = new Command();

program
  .name("claude-env")
  .description("Manage env variables in ~/.claude/settings.json")
  .version("1.0.0");

// list
program
  .command("list")
  .alias("ls")
  .description("List all env variables")
  .action(() => {
    const settings = readSettings();
    const env = getEnv(settings);
    const entries = Object.entries(env);

    if (entries.length === 0) {
      console.log(chalk.yellow("No env variables set."));
      return;
    }

    console.log(chalk.bold(`\n${SETTINGS_PATH} → env:\n`));
    for (const [key, value] of entries) {
      console.log(`  ${chalk.cyan(key)} = ${chalk.green(value)}`);
    }
    console.log();
  });

// get
program
  .command("get <key>")
  .description("Get value of an env variable")
  .action((key: string) => {
    const settings = readSettings();
    const env = getEnv(settings);

    if (!(key in env)) {
      console.log(chalk.yellow(`Key "${key}" not found.`));
      process.exit(1);
    }

    console.log(env[key]);
  });

// set
program
  .command("set <key> <value>")
  .description("Set an env variable (creates or updates)")
  .action((key: string, value: string) => {
    const settings = readSettings();
    settings.env = getEnv(settings);
    const existed = key in settings.env;
    settings.env[key] = value;
    writeSettings(settings);

    const action = existed ? chalk.yellow("updated") : chalk.green("added");
    console.log(`${action} ${chalk.cyan(key)} = ${chalk.green(value)}`);
  });

// remove
program
  .command("remove <key>")
  .alias("rm")
  .description("Remove an env variable")
  .action((key: string) => {
    const settings = readSettings();
    const env = getEnv(settings);

    if (!(key in env)) {
      console.log(chalk.yellow(`Key "${key}" not found.`));
      process.exit(1);
    }

    delete env[key];
    settings.env = env;
    writeSettings(settings);
    console.log(`${chalk.red("removed")} ${chalk.cyan(key)}`);
  });

// clear
program
  .command("clear")
  .description("Remove all env variables")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (opts) => {
    if (!opts.yes) {
      process.stdout.write(
        chalk.yellow("Remove ALL env variables? ") + chalk.dim("[y/N] ")
      );
      const answer = await new Promise<string>((resolve) => {
        process.stdin.once("data", (d) => resolve(d.toString().trim()));
      });
      if (answer.toLowerCase() !== "y") {
        console.log("Aborted.");
        return;
      }
    }

    const settings = readSettings();
    const count = Object.keys(getEnv(settings)).length;
    settings.env = {};
    writeSettings(settings);
    console.log(chalk.red(`Cleared ${count} env variable(s).`));
  });

// providers — list all providers in key.json
program
  .command("providers")
  .description("List all providers defined in key.json")
  .action(() => {
    const keys = readKeyJson();
    const names = Object.keys(keys);
    if (names.length === 0) {
      console.log(chalk.yellow("No providers found in key.json."));
      return;
    }
    console.log(chalk.bold("\nProviders in key.json:\n"));
    for (const name of names) {
      const vars = Object.keys(keys[name]!);
      console.log(`  ${chalk.cyan(name)} ${chalk.dim(`(${vars.length} vars)`)}`);
    }
    console.log();
  });

// use — select a provider from key.json and apply its env vars
program
  .command("use [provider]")
  .alias("switch")
  .description("Apply all env vars from a key.json provider to settings.json")
  .action(async (provider?: string) => {
    const keys = readKeyJson();
    const names = Object.keys(keys);

    if (!provider) {
      provider = await promptSelect(names);
    }

    if (!(provider in keys)) {
      console.error(
        chalk.red(`Provider "${provider}" not found in key.json.`) +
          chalk.dim(` Available: ${names.join(", ")}`)
      );
      process.exit(1);
    }

    const settings = readSettings();
    const providerEnv = keys[provider]!;
    settings.env = { ...getEnv(settings), ...providerEnv };
    writeSettings(settings);

    console.log(
      chalk.green(`\nSwitched to provider: ${chalk.bold(provider)}\n`)
    );
    for (const [k, v] of Object.entries(providerEnv)) {
      console.log(`  ${chalk.cyan(k)} = ${chalk.green(v)}`);
    }
    console.log();
  });

program.parse();
