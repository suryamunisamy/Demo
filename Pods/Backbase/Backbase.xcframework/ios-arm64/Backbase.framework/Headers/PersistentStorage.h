//
//  PersistentStorage.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 18/05/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef PERSISTENTSTORAGE_CLASS
#define PERSISTENTSTORAGE_CLASS

/// Persistent storage plugin specification.
@protocol PersistentStorageSpec <Plugin>
@end

@interface PersistentStorage : BBStorage <PersistentStorageSpec, BBStorageSpec>
@end

#endif
