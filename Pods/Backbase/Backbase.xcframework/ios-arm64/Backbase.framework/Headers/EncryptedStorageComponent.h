//
//  EncryptedStorageComponent.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/08/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef ENCRYPTEDSTORAGECOMPONENT_CLASS
#define ENCRYPTEDSTORAGECOMPONENT_CLASS

/**
 * Provides secure encrypted persistent storage capabilities based on a key-value storage.
 * Only supports keys as strings and values as string.
 * The information is stored encrypted using platform's default secured storage.
*/
@interface EncryptedStorageComponent : AbstractStorageComponent <StorageComponent>
@end

#endif
