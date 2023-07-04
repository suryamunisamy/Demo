//
//  StorageComponent.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 03/10/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef STORAGECOMPONENT_PROTOCOL
#define STORAGECOMPONENT_PROTOCOL

extern NSString* _Nonnull const kBBStorageEventKey;

/// Generic Storage component specification. Useful to define interchangeable storage mechanisms.
@protocol StorageComponent <NSObject>

/**
 * Stores the given value under the given key.
 * @param value String value to store
 * @param key   String key to identify the value.
 * @discussion For optimization purposes, storing a nil-value is equivalent to remove it from the storage.
 */
- (void)setItem:(NSString* _Nullable)value forKey:(NSString* _Nonnull)key;

/**
 * Removes the value of a given key.
 * @param key   String key to identify the value.
 */
- (void)removeItem:(NSString* _Nonnull)key;

/**
 * Gets the value under the given key
 * @param key   String key to identify the value.
 * @return The stored value on the key if exists, nil otherwise.
 */
- (NSString* _Nullable)getItem:(NSString* _Nonnull)key;

/**
 * Removes all stored items from this storage. Use with caution.
 */
- (void)clear;

/**
 * Registers the given target-selector pair to listen for storage event changes.
 * The selector must receive a NSNotification object that will contain in the userInfo the following information:
 * <ul>
 *  <li>key</li>
 *  <li>oldValue</li>
 *  <li>newValue</li>
 * </ul>
 *
 * @param target   Object that will receive the notification of item changed
 * @param selector Selector to be executed whenever a change occurs.
 */
- (void)subscribe:(id _Nonnull)target selector:(SEL _Nonnull)selector;

/**
 * Unegisters the given target-selector pair to listen for storage event changes.
 * @param target   Object that will receive the notification of item changed
 * @param selector Selector to be executed whenever a change occurs.
 */
- (void)unsubscribe:(id _Nonnull)target selector:(SEL _Nonnull)selector;

@optional
/**
 * Removes all items for which their keys start with the given prefix.
 * @param prefix The prefix to be used for removing the items.
 */
- (void)clearAllWithKeyPrefix:(NSString * _Nonnull)prefix;

@end

#endif
