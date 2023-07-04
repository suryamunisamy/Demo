//
//  Backbase+Core.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 30/04/15.
//

#import <Backbase/Backbase.h>
#import <Foundation/Foundation.h>

/**
 * Entry point for the Backbase library.
 * This class provides convenient methods to save some boiler-plate code, and also to provide access to otherwise
 * private or protected APIs
 */
@interface Backbase : NSObject

#pragma mark - Initialization

/**
 * Initializes the Backbase internal states and prepare the proper functioning of subsequent methods.
 * @param configurationPath The file path containing the configuration information.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return Yes if the objects could be initialized properly. No otherwise.
 * @discussion By default the configuration file could be encrypted or not. This method will attempt to decrypt the file
 * and it will fall back to read as plain if the decryption failed. To override this behavior use the
 * initialize:forceDecryption:error: instead
 */
+ (BOOL)initialize:(NSString* _Nonnull)configurationPath error:(NSError* _Nullable* _Nullable)error;

/**
 * Initializes the Backbase internal states and prepare the proper functioning of subsequent methods.
 * @param configurationPath The file path containing the configuration information.
 * @param forceDecryption Switch off/on the force decryption. When forceDecryption is NO, it will attempt to read as
 * plain JSON as fallback
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return Yes if the objects could be initialized properly. No otherwise.
 */
+ (BOOL)initialize:(NSString* _Nonnull)configurationPath
    forceDecryption:(BOOL)forceDecryption
              error:(NSError* _Nullable* _Nullable)error;

/**
 * Initializes the Backbase internal states and prepare the proper functioning of subsequent methods.
 * @discussion The configuration URL could be an internal or external URL. In either case, the SDK will retreive the
 * content of the configuration URL synchronously.
 * By default the configuration file could be encrypted or not. This method will attempt to decrypt the file
 * and it will fall back to read as plain if the decryption failed. To override this behavior use the
 * initializeFromURL:forceDecryption:error: instead
 * @param configurationURL The file path containing the configuration information.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return Yes if the objects could be initialized properly. No otherwise.
 */
+ (BOOL)initializeFromURL:(NSURL* _Nonnull)configurationURL error:(NSError* _Nullable* _Nullable)error;

/**
 * Initializes the Backbase internal states and prepare the proper functioning of subsequent methods.
 * @discussion The configuration URL could be an internal or external URL. In either case, the SDK will retreive the
 * content of the configuration URL synchronously.
 * @param configurationURL The file path containing the configuration information.
 * @param forceDecryption Switch off/on the force decryption. When forceDecryption is NO, it will attempt to read as
 * plain JSON as fallback
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return Yes if the objects could be initialized properly. No otherwise.
 */
+ (BOOL)initializeFromURL:(NSURL* _Nonnull)configurationURL
          forceDecryption:(BOOL)forceDecryption
                    error:(NSError* _Nullable* _Nullable)error;

/**
 * Retrieves the configuration object.
 * If this method is called before the initialize method, an exception will be raised.
 * @return A configuration object
 */
+ (BBConfiguration* _Nonnull)configuration;

/**
 * Rertrieves the current SDK version.
 * @return A string with the version number.
 */
+ (NSString* _Nonnull)version;

@end
