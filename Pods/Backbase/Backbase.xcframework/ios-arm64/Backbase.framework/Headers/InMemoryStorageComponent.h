//
//  InMemoryStorageComponent.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 03/10/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef INMEMORYSTORAGECOMPONENT_CLASS
#define INMEMORYSTORAGECOMPONENT_CLASS

/**
 * Provides in-memory (volatile) storage capabilities based on a key-value storage.
 * Only supports keys as strings and values as string.
 * The information is stored as-is.
 */
@interface InMemoryStorageComponent : AbstractStorageComponent <StorageComponent>
@end

#endif
