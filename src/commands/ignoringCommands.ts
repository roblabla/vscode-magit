import { MagitRepository } from '../models/magitRepository';
import { MenuUtil, MenuState } from '../menu/menu';
import { QuickMenuUtil, QuickItem } from '../menu/quickMenu';
import FilePathUtils from '../utils/filePathUtils';
import * as fs from 'fs';
import { window } from 'vscode';
import { EOL } from 'os';
import * as Constants from '../common/constants';

const ignoringMenu = {
  title: 'Ignoring',
  commands: [
    { label: 'l', description: 'Ignore locally', action: ({ repository }: MenuState) => ignore(repository) },
    { label: 'g', description: 'Ignore globally (add to .gitignore)', action: ({ repository }: MenuState) => ignore(repository, true) }
  ]
};

export async function ignoring(repository: MagitRepository) {
  return MenuUtil.showMenu(ignoringMenu, { repository });
}

async function ignore(repository: MagitRepository, globally = false) {

  const ignoreSuggestions: QuickItem<string>[] = [];

  repository.magitState?.untrackedFiles.forEach(change => {
    const fileName = FilePathUtils.fileName(change.originalUri);
    const fileExtension = FilePathUtils.fileExtension(fileName);

    const globPattern1 = `/*.${fileExtension}`;
    const globPattern2 = `*.${fileExtension}`;

    ignoreSuggestions.push({ label: fileName, meta: fileName });
    ignoreSuggestions.push({ label: globPattern1, meta: globPattern1 });
    ignoreSuggestions.push({ label: globPattern2, meta: globPattern2 });
  }) ?? [];

  const ignorePattern = await QuickMenuUtil.showMenuWithFreeform(ignoreSuggestions, `File or pattern to ignore ${globally ? 'globally' : 'locally'}`);

  if (ignorePattern) {

    let gitIgnoreFilePath: string;

    if (globally) {
      gitIgnoreFilePath = repository.rootUri.fsPath + '/.gitignore';
    } else {
      gitIgnoreFilePath = repository.rootUri.fsPath + '/.git/info/exclude';
    }

    return new Promise((resolve, reject) => {
      fs.appendFile(gitIgnoreFilePath, EOL + ignorePattern, (err) => {
        if (err) {
          reject(err);
          return;
        }
        window.setStatusBarMessage(`Wrote file ${gitIgnoreFilePath}`, Constants.StatusMessageDisplayTimeout);
        resolve();
      });
    });
  }
}