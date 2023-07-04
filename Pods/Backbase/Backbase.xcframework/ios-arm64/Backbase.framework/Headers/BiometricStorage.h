//
//  EncryptedStorage.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/08/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BIOMETRICSTORAGE_CLASS
#define BIOMETRICSTORAGE_CLASS

@protocol BiometricStorageSpec <Plugin>
-(void) isBiometricSupported:(NSString*)callbackId;
@end

@interface BiometricStorage : BBStorage <BiometricStorageSpec, BBStorageSpec>
@end

#endif
