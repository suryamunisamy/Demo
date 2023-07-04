//
//  NativeContract.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 22/08/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
@protocol Renderable;

#ifndef NATIVECONTRACT_PROTOCOL
#define NATIVECONTRACT_PROTOCOL

/**
 * Native contract, allows to define what functionality will be available for the Renderer and Views to be used.
 * The contract depends entirely on the functionally that the widget/container/page wants to provide. This protocol
 * can be seen as the Model part on an MVC or MVVM pattern.
 */
@protocol NativeContract <NSObject>

/// Gets the reference of the renderable associated to the contract implementation
@property (strong, nonatomic, nonnull) NSObject<Renderable> *renderable;
@end

#endif
