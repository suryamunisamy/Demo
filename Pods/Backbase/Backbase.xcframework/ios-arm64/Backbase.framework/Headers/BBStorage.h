//
//  BBStorage.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 03/10/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>
@protocol StorageComponent;

#ifndef BBSTORAGE_CLASS
#define BBSTORAGE_CLASS

/// Generic storage component plugin specification.
@protocol BBStorageSpec <Plugin>
/**
 * Sets a value in the given key.
 * If the key doesn't exists the value is inserted. If the key already exists it's override by the new value.
 * @param callbackId The callbackId that this invocation refers to.
 * @param key The key's name to be stored
 * @param value The value to insert / replace in the given key.
 * @discussion This method's signature differs from the objective-c standard (setItem:forKey):
 * <ol>
 * <li>to compliant with W3C specification of the Storage interface. </li>
 * <li>to provide the correct method name in javascript plugin.setItem('key', 'value'); </li>
 * </ol>
 */
- (void)setItem:(NSString* _Nonnull)callbackId /* key */:(NSString* _Nonnull)key /* value */:(NSString* _Nullable)value;

/**
 * Removes the element's given key from the storage.
 * If the element doesn't exist, it has no effect.
 * @param callbackId The callbackId that this invocation refers to.
 * @param key The key's name to be stored
 */
- (void)removeItem:(NSString* _Nonnull)callbackId /* key */:(NSString* _Nonnull)key;

/**
 * Gets the value in the given key.
 * @param callbackId The callbackId that this invocation refers to.
 * @param key The key's name to be stored
 */
- (void)getItem:(NSString* _Nonnull)callbackId /* key */:(NSString* _Nonnull)key;

/**
 * Clears all keys from the storage. All data related to this bucket is lost.
 * @param callbackId The callbackId that this invocation refers to.
 */
- (void)clear:(NSString* _Nonnull)callbackId;

/**
 * Convenience method to retrieve the last known CSRF token.
 * @param callbackId The callbackId that this invocation refers to.
 */
- (void)getCsrfToken:(NSString* _Nonnull)callbackId;

@end

@interface BBStorage : Plugin <BBStorageSpec>
@property (strong, readonly, nonnull) NSObject<StorageComponent>* storageComponent;
@end

#endif
