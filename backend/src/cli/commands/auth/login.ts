import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { z } from "zod";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import yoctoSpinner from "yocto-spinner";

import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises"
import path from "node:path";
import os from "node:os";
import open from "open"
import { logger } from "better-auth";
import prisma from "../../../lib/db";

const DEMO_URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CONFIG_DIR = path.join(os.homedir(), ".better-auth")
const TOKEN_FILE = path.join(CONFIG_DIR, "token");


export async function getStoredToken() {
    try {
        const data = await fs.readFile(TOKEN_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        //file does not exists or cant be read
        return null;
    }
}

export async function storeToken(token: any) {
    try {
        //ensure config dir exists
        await fs.mkdir(CONFIG_DIR, { recursive: true });

        //Store token with metadata
        const tokenData = {
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_type: token.token_type || "Bearer",
            scope: token.scope,
            expires_at: token.expires_in
                ? new Date(Date.now() + token.expires_in * 1000).toISOString()
                : null,
            created_at: new Date().toISOString(),
        }

        await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");;
        return true
    } catch (error: any) {
        console.error("Failed to store token:", error.message);
        return false;
    }
}


export async function clearStoredToken() {
    try {
        await fs.unlink(TOKEN_FILE);
        return true;
    } catch (error: any) {
        //file does not exists or cant be deleted
        console.error("Failed to clear stored token:", error.message);
        return false;
    }
}


export async function isTokenExpired() {
    const token = await getStoredToken();
    if (!token || !token.expires_at) {
        return true;
    }

    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}

export async function requireAuth() {
    const token = await getStoredToken();

    if (!token) {
        console.log(chalk.red("You are not logged in. Please login first"))
        process.exit(1);
    }

    if (await isTokenExpired()) {
        console.log(chalk.yellow("Your session has expired. Please login again"))
        console.log(chalk.gray("Run codev login to login again"))
        process.exit(1);
    }

    return token;
}


//login command
export async function loginAction(opts: any) {
    const options = z.object({
        serverUrl: z.string().optional(),
        clientId: z.string().optional(),
    }).parse(opts);

    const serverUrl = options.serverUrl || DEMO_URL;
    const clientId = options.clientId || CLIENT_ID;

    intro(chalk.bold("Better Auth CLI Login"));

    if (!clientId) {
        logger.error("CLIENT_ID is not set in .env file")
        console.log(
            chalk.red("\n Please set GITHUB_CLIENT_ID in .env file")
        )
        process.exit(1)
    }

    const existingToken = true;
    const expired = true;

    if (existingToken && !expired) {
        const confirmLogin = await confirm({
            message: "You are already logged in. Do you want to log in again?",
            initialValue: false,
        })

        if (isCancel(confirmLogin)) {
            cancel("Login cancelled");
            process.exit(0);
        }
    }

    //create the auth client
    const authClient = createAuthClient({
        baseUrl: serverUrl,
        clientId,
        plugins: [
            deviceAuthorizationClient()
        ]
    })

    const spinner = yoctoSpinner({ text: "Requesting device authorization..." })
    spinner.start();

    try {
        //Request device code
        const { data, error } = await authClient.device.code({
            client_id: clientId,
            scope: "openid profile email"
        });

        spinner.stop();

        if (error || !data) {
            logger.error(`Failed to request device authorization: ${error?.error_description || "Unknown error"}`)

            if (error?.status === 404) {
                console.log(chalk.red("\nDevice authorization endpoint not found."));
                console.log(chalk.yellow(" Make sure your auth server is running."));
            } else if (error?.status === 400) {
                console.log(
                    chalk.red("\n Bad request - check your CLIENT_ID configuration.")
                );
            }

            process.exit(1);
        }

        const { device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval = 5 } = data;

        //Device Authorization instructions
        console.log("");
        console.log(chalk.cyan("Device Authorization Required"))
        console.log("");
        console.log(`Please visit: ${chalk.underline.blue(verification_uri_complete)}`)
        console.log(`Enter the code: ${chalk.underline.green(user_code)}`)
        console.log("")

        //ask if user wants to open browser

        const shouldOpen = await confirm({
            message: "open browser automatically?",
            initialValue: true,
        })

        if (isCancel(shouldOpen) && shouldOpen) {
            const urlOpen = verification_uri_complete || verification_uri;
            await open(urlOpen);
        }

        //Start polling for token
        console.log(
            chalk.gray(
                `Waiting for Authentication (expires in ${Math.floor(
                    expires_in / 60
                )} minutes)...`
            )
        )

        const token = await pollForToken(
            authClient,
            device_code,
            clientId,
            interval
        )

        if (token) {
            //store the token
            const saved = await storeToken(token);
            if (!saved) {
                console.log(
                    chalk.yellow("Failed to save authentication token")
                );

                console.log(
                    chalk.gray("You may need to run codev login on next use")
                )
            }

            const { data: session } = await authClient.getSession({
                fetchOptions: {
                    headers: {
                        Authorization: `Bearer ${token.access_token}`,
                    },
                },
            })

            outro(
                chalk.green(
                    `Logged in successfully as ${session?.user.email || session?.user.name}`
                )
            )

            console.log(chalk.gray(`Token saved to: ${TOKEN_FILE}`))

            console.log(
                chalk.gray(
                    `You can now use AI commands without logging in again.\n`
                )
            )
        }
    } catch (error) {
        spinner.stop();
        console.log(chalk.red("Failed to login: ", error));
        process.exit(1);
    }
}


interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
}

async function pollForToken(authClient: any, deviceCode: string, clientId: string, initialInterval: number): Promise<TokenResponse | null> {
    let pollingInterval = initialInterval;
    const spinner = yoctoSpinner({ text: "Waiting for authentication...", color: "cyan" });
    let dots = 0

    return new Promise<TokenResponse | null>((resolve, reject) => {
        const poll = async () => {
            dots = (dots + 1) % 4;
            spinner.text = chalk.gray(`Polling for authorization${".".repeat(dots)}${"".repeat(3 - dots)}`)

            if (!spinner.isSpinning) spinner.start();

            try {
                const { data, error } = await authClient.device.token({
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code: deviceCode,
                    client_id: clientId,
                    fetchOptions: {
                        headers: {
                            "user-agent": `Better Auth CLI`,
                        },
                    },
                });

                if (data?.access_token) {
                    console.log(
                        chalk.bold.yellow(`Your access token is: ${data.access_token}`)
                    );

                    spinner.stop();
                    resolve(data);
                    return;
                } else if (error) {
                    switch (error.error) {
                        case "authorization_pending":
                            // Continue polling
                            break;
                        case "slow_down":
                            pollingInterval += 5;
                            break;
                        case "access_denied":
                            spinner.stop();
                            logger.error("Access was denied by the user");
                            process.exit(1);
                            break;
                        case "expired_token":
                            spinner.stop();
                            logger.error("The device code has expired. Please try again.");
                            process.exit(1);
                            break;
                        default:
                            spinner.stop();
                            logger.error(`Error: ${error.error_description}`);
                            process.exit(1);
                    }
                }

            } catch (error) {
                spinner.stop();
                logger.error(chalk.red("Failed to poll for token: ", error));
                process.exit(1);
            }

            setTimeout(poll, pollingInterval * 1000);
        }

        setTimeout(poll, pollingInterval * 1000)
    })
}


//logout command

export async function logoutAction() {
    intro(chalk.bold("Logging out..."));

    const token = await getStoredToken();

    if (!token) {
        console.log(chalk.yellow("You're not logged in."))
        process.exit(0)
    }

    const shouldLogout = await confirm({
        message: "Are you sure you want to logout?",
        initialValue: false,
    });

    if (isCancel(shouldLogout) || !shouldLogout) {
        cancel("logout cancelled")
        process.exit(0)
    }

    const cleared = await clearStoredToken();

    if (cleared) {
        outro(chalk.green("Logged out successfully"))
    } else {
        console.log(chalk.yellow("Could not clear token file."))
    }
}


export async function whoamiAction() {
    const token = await getStoredToken();

    if (!token.access_token) {
        console.log("No access token found. Please login.")
        process.exit(1)
    }

    const user = await prisma.user.findFirst({
        where: {
            sessions: {
                some: {
                    token: token.access_token,
                }
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
        }
    });

    //ouput user session info
    console.log(
        chalk.bold.greenBright(`\n👤 User: ${user?.name}
    📧 Email: ${user?.email}
    👤 ID: ${user?.id}`)
    );
}


//commander setup

export const login = new Command("login")
    .description("Login to Better Auth account")
    .option("--server-url <url>", "Auth server URL", DEMO_URL)
    .option("--client-id <id>", "The OAuthClient ID", CLIENT_ID)
    .action(loginAction);
    
export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "The Better Auth server URL", DEMO_URL)
  .action(whoamiAction);
