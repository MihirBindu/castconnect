const isDev = process.env.NODE_ENV !== 'production';

function fmt(level: string, module: string, message: string, data?: unknown): string {
  return `[${level}][${module}] ${message}${data !== undefined ? ' ' + JSON.stringify(data) : ''}`;
}

export function createLogger(module: string) {
  return {
    info:  (msg: string, data?: unknown) => isDev && console.log(fmt('INFO', module, msg, data)),
    warn:  (msg: string, data?: unknown) => isDev && console.warn(fmt('WARN', module, msg, data)),
    error: (msg: string, data?: unknown) => console.error(fmt('ERROR', module, msg, data)),
    debug: (msg: string, data?: unknown) => isDev && console.debug(fmt('DEBUG', module, msg, data)),
  };
}
