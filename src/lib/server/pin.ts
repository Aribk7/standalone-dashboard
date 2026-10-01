import "server-only";
import { generatePin, pinIndex } from "./crypto";
import { PinTakenError } from "./store";

/** Runs `save` with fresh PINs until one is unique. Returns the PIN that was saved. */
export async function withUniquePin(save: (pinIndex: string) => Promise<void>): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const pin = generatePin();
    try {
      await save(pinIndex(pin));
      return pin;
    } catch (e) {
      if (!(e instanceof PinTakenError)) throw e;
    }
  }
  throw new Error("Could not allocate a unique PIN");
}
