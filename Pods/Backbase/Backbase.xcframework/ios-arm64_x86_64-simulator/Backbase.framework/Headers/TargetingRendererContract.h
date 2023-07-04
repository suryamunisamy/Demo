//
//  TargetingContract.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 31/07/2018.
//  Copyright © 2018 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef TARGETINGRENDERERCONTRACT_PROTOCOL
#define TARGETINGRENDERERCONTRACT_PROTOCOL

/**
 * Conforming object can be notified to start a alternative selection process.
 */
@protocol TargetingRendererContract <NativeContract>

/**
 * Starts the alternative selection process.
 */
- (void)selectAlternative;

@end

#endif
