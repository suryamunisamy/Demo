//
//  PersistentStorageComponent.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 18/05/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef PERSISTENTSTORAGECOMPONENT_CLASS
#define PERSISTENTSTORAGECOMPONENT_CLASS

/**
 * Provides persistent storage capabilities based on a key-value storage.
 * Only supports keys as strings and values as string.
 * The information is stored as-is.
 */
@interface PersistentStorageComponent : AbstractStorageComponent <StorageComponent>
@end

#endif
