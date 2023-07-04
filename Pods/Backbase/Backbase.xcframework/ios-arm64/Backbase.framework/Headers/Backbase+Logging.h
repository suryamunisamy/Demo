//
//  Backbase+Logging.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 17/06/15.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASELOGGING_CLASS
#define BACKBASELOGGING_CLASS

@interface Backbase (Logging)
/**
 * Set the loglevel for logging the SDK.
 * Default is 'logDebug'.
 * @param logLevel The loglevel of the log messages.
 */
+ (void)setLogLevel:(BBLogLevel)logLevel;

/**
 * Get the logLevel of the SDK logging.
 * @return The loglevel of the SDK logging.
 */
+ (BBLogLevel)logLevel;

/**
 * Log when logging level is at least 'logDebug'
 * @param obj Object in log
 * @param message Message to log
 */
+ (void)logDebug:(id _Nullable)obj message:(NSString* _Nullable)message;

/**
 * Log when logging level is at least 'logInfo'
 * @param obj Object in log
 * @param message Message to log
 */
+ (void)logInfo:(id _Nullable)obj message:(NSString* _Nullable)message;

/**
 * Log when logging level is at least 'logWarning'
 * @param obj Object in log
 * @param message Message to log
 */
+ (void)logWarning:(id _Nullable)obj message:(NSString* _Nullable)message;

/**
 * Log when logging level is at least 'logError'
 * @param obj Object in log
 * @param message Message to log
 */
+ (void)logError:(id _Nullable)obj message:(NSString* _Nullable)message;

/**
 * Redirects the output of the console log to a specified file.
 * Everytime the file is redirected it's wiped out.
 * @param path  Path to write the log file.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the log file was created and the redirection can start.
 * @discussion Redirect implies a penalty in performance since all log entries are written twice, once in the stderr and
 * another in a file which is slower than the stderr. Use this functionality only if necessary.
 */
+ (BOOL)redirectLogToFile:(NSString* _Nonnull)path error:(NSError* _Nullable* _Nullable)error;
@end

#endif
