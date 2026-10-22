import { ZipWriter } from "./encode";
import type { OutputSink } from "./pipeline";

const toBytes = (data: Uint8Array | string) =>
  typeof data === "string" ? new TextEncoder().encode(data) : data;

/** Collects every file into a ZIP archive that can be downloaded afterwards. */
export class ZipSink implements OutputSink {
  private zip = new ZipWriter();

  async write(path: string, data: Uint8Array | string): Promise<void> {
    this.zip.add(path, toBytes(data));
  }

  finish(): Blob {
    return this.zip.finish();
  }
}

// File System Access API (Chromium browsers). Not part of the TS DOM lib.
interface WritableFile {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}
interface FsFileHandle {
  createWritable(): Promise<WritableFile>;
}
export interface FsDirectoryHandle {
  name: string;
  getDirectoryHandle(name: string, options?: { create: boolean }): Promise<FsDirectoryHandle>;
  getFileHandle(name: string, options?: { create: boolean }): Promise<FsFileHandle>;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(): Promise<FsDirectoryHandle> {
  const picker = (
    window as unknown as {
      showDirectoryPicker(options: { mode: "readwrite" }): Promise<FsDirectoryHandle>;
    }
  ).showDirectoryPicker;
  return picker.call(window, { mode: "readwrite" });
}

/** Writes files straight into a folder the user picked. */
export class DirectorySink implements OutputSink {
  private dirs = new Map<string, FsDirectoryHandle>();

  constructor(private readonly root: FsDirectoryHandle) {}

  private async dir(parts: string[]): Promise<FsDirectoryHandle> {
    let current = this.root;
    let key = "";
    for (const part of parts) {
      key += `/${part}`;
      let next = this.dirs.get(key);
      if (!next) {
        next = await current.getDirectoryHandle(part, { create: true });
        this.dirs.set(key, next);
      }
      current = next;
    }
    return current;
  }

  async write(path: string, data: Uint8Array | string): Promise<void> {
    const parts = path.split("/");
    const file = parts.pop() as string;
    const dir = await this.dir(parts);
    const handle = await dir.getFileHandle(file, { create: true });
    const writable = await handle.createWritable();
    await writable.write(toBytes(data));
    await writable.close();
  }
}
