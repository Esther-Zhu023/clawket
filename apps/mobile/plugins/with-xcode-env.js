const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GENERATED_BLOCK_START = '# @generated begin clawket-xcode-env';
const GENERATED_BLOCK_END = '# @generated end clawket-xcode-env';

const GENERATED_BLOCK = [
  GENERATED_BLOCK_START,
  '# Load app-level dotenv files so Xcode Archive sees EXPO_PUBLIC_* values.',
  'if [ -n "${PODS_ROOT:-}" ]; then',
  '  CLAWKET_IOS_ROOT="$(cd "$PODS_ROOT/.." && pwd)"',
  'else',
  '  CLAWKET_IOS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
  'fi',
  'CLAWKET_APP_ROOT="$(cd "$CLAWKET_IOS_ROOT/.." && pwd)"',
  'load_dotenv_file() {',
  '  local env_file="$1"',
  '  local raw_line=""',
  '  local line=""',
  '  local key=""',
  '  local value=""',
  '  [ -f "$env_file" ] || return 0',
  '  while IFS= read -r raw_line || [ -n "$raw_line" ]; do',
  '    line="${raw_line#"${raw_line%%[![:space:]]*}"}"',
  '    line="${line%"${line##*[![:space:]]}"}"',
  '    case "$line" in',
  "      ''|'#'*) continue ;;",
  '    esac',
  '    case "$line" in',
  '      export\\ *) line="${line#export }" ;;',
  '    esac',
  '    case "$line" in',
  '      *=*) ;;',
  '      *) continue ;;',
  '    esac',
  '    key="${line%%=*}"',
  '    value="${line#*=}"',
  '    key="${key%"${key##*[![:space:]]}"}"',
  '    case "$value" in',
  '      \\"*\\") value="${value#\\"}"; value="${value%\\"}" ;;',
  '    esac',
  '    export "$key=$value"',
  '  done < "$env_file"',
  '}',
  'for env_file in "$CLAWKET_APP_ROOT/.env" "$CLAWKET_APP_ROOT/.env.local"; do',
  '  load_dotenv_file "$env_file"',
  'done',
  GENERATED_BLOCK_END,
  '',
].join('\n');

function mergeGeneratedBlock(content) {
  if (content.includes(GENERATED_BLOCK_START) && content.includes(GENERATED_BLOCK_END)) {
    return content.replace(
      new RegExp(`${GENERATED_BLOCK_START}[\\s\\S]*?${GENERATED_BLOCK_END}\\n?`, 'm'),
      GENERATED_BLOCK,
    );
  }

  const normalizedContent = content.endsWith('\n') ? content : `${content}\n`;
  return `${normalizedContent}\n${GENERATED_BLOCK}`;
}

function withXcodeEnv(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const xcodeEnvPath = path.join(cfg.modRequest.platformProjectRoot, '.xcode.env');
      const existingContent = fs.existsSync(xcodeEnvPath) ? fs.readFileSync(xcodeEnvPath, 'utf8') : '';
      const nextContent = mergeGeneratedBlock(existingContent);

      if (nextContent !== existingContent) {
        fs.writeFileSync(xcodeEnvPath, nextContent);
      }

      return cfg;
    },
  ]);
}

module.exports = withXcodeEnv;
