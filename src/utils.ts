import { ExtractAbiEventNames } from "abitype";
import {
  Abi,
  GetEventArgs,
  Hex,
  TransactionReceipt,
  decodeEventLog,
  encodeEventTopics,
} from "viem";

export function decodeEventFromReceipt<
  TAbi extends Abi,
  TEventName extends ExtractAbiEventNames<TAbi>,
>(args: {
  receipt: TransactionReceipt;
  abi: TAbi;
  event: TEventName;
}): GetEventArgs<
  TAbi,
  TEventName,
  { EnableUnion: false; IndexedOnly: false; Required: true }
> {
  const data = encodeEventTopics({
    abi: args.abi as Abi,
    eventName: args.event as string,
  });

  const log = args.receipt.logs.find((log) => log.topics[0] === data[0]);

  if (log === undefined) {
    // should never happen
    throw new Error("Event not found in receipt");
  }

  const decoded = decodeEventLog({
    abi: args.abi as Abi,
    eventName: args.event as string,
    data: log.data,
    topics: log.topics as [Hex, ...Hex[]],
  });

  // typed at the function signature already
  return decoded.args as GetEventArgs<
    TAbi,
    TEventName,
    { EnableUnion: false; IndexedOnly: false; Required: true }
  >;
}
