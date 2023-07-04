//
//  AbstractStorageComponent.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 04/10/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef ABSTRACTSTORAGECOMPONENT_CLASS
#define ABSTRACTSTORAGECOMPONENT_CLASS

/**
 * Storage component abstraction with common behaviors to allow uniform interactions between the different kinds of
 * storages
 */
@interface AbstractStorageComponent : NSObject <StorageComponent>

/**
 * Sends a pub/sub notification that an item in the storage has changed. The notification will contain the
 * given key, oldValue and newValue of the item changed. If the item has been removed, the notification will contain,
 * nil as the newValue. Similarly, when setting an element for the first time, the oldValue will be nil.
 *
 *  @param key      Key of the object that has changed
 *  @param oldValue The previous value of the object, nil if the object didn't exist in the storage.
 *  @param newValue The new value of the element, nil if the object is being removed.
 */
- (void)sendNotification:(NSString* _Nonnull)key
                oldValue:(NSString* _Nullable)oldValue
                newValue:(NSString* _Nullable)newValue;

@end

#endif
