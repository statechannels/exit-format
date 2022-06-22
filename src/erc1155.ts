import { defaultAbiCoder } from "@ethersproject/abi";
import { BytesLike } from "@ethersproject/bytes";

export function makeERC1155ExitMetadata(tokenId: number): BytesLike {
  return defaultAbiCoder.encode(["tuple(uint256)"], [[tokenId]]);
}
