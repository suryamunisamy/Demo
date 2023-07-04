// 
//  BiometricStorageComponent.h
//  Backbase
//
//  Created by Backbase B.V. on 07/06/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Backbase/Backbase.h>

#ifndef BIOMETRICSTORAGECOMPONENT_CLASS
#define BIOMETRICSTORAGECOMPONENT_CLASS

@interface BiometricStorageComponent : EncryptedStorageComponent
@property (strong, nonatomic, nullable, readwrite) NSString* promptTitle;

- (BOOL)isBiometricSupported;
@end

#endif
