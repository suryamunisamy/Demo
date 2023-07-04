//
//  Created by Backbase on 24.08.2022.
//  Copyright © 2022 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// A helper class that provides cipher related decryption methods.
@interface BBCipherUtils : NSObject

/**
 * Decrypts the provided configuration data using the configured encryption method.
 * Currently supports AES/GCM/NoPadding and AES/CBC/PKCS5Padding decryption.
 * @warning AES/CBC/PKCS5Padding is deprecated in bb-mobile, using this algorithm will result in a warning log.
 * @param configData data to be decrypted.
 * @param error a pointer to an NSError which gets populated when an error occurs.
 * @return A dictionary containing the decrypted data in case of success, nil otherwise.
 */
+ (nullable NSDictionary<NSString*, id>*)decryptConfiguration:(NSData*)configData error:(NSError**)error;

@end

NS_ASSUME_NONNULL_END
