import chalk from 'chalk';
const error = chalk.bold.red;
const warning = chalk.keyword('orange');
const info = chalk.keyword('green');
const _log = (_message: any) => console.log(`${new Date().toLocaleTimeString()} - ${_message}`);
export class Logger {

    log(message?: any, ...optionalParams: any[]): void {
        // console.log(message, optionalParams);
        _log(info(message, optionalParams));
    }

    info(message?: any, ...optionalParams: any[]): void {
        // console.info(message, optionalParams);
        _log(info(message, optionalParams));
    }

    error(message?: any, ...optionalParams: any[]): void {
        // console.error(message, optionalParams);
        _log(error(message, optionalParams));
    }

    warn(message?: any, ...optionalParams: any[]): void {
        // console.warn(message, optionalParams);
        _log(warning(message, optionalParams));
    }
}

export default new Logger();