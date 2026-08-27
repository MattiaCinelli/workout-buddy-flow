import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Hands a generated text file to the user: the OS share sheet on the
// installed Android app (a plain <a download> is inert in the WebView), a
// normal browser download on the web.
export const saveTextFile = async (text: string, filename: string, mimeType: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({
      path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, url: saved.uri, dialogTitle: 'Export' });
    return;
  }
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
