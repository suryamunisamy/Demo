//
//  BBTargetingCallback.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 30/11/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

@protocol Renderable;

/// Callback definition for Targeting alternative selection
typedef void (^BBTargetingSelectCallback)(NSObject<Renderable>* _Nonnull, NSError* _Nullable);

/// Callback definition for Targeting profile update.
typedef void (^BBTargetingExecuteCallback)(NSString* _Nullable, NSError* _Nullable);
