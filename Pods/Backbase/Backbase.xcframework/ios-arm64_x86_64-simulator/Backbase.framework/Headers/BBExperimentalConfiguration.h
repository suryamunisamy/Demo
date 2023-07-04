// 
//  BBExperimentalConfiguration.h
//  Backbase
//
//  Created by Backbase B.V. on 14/08/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

/// Experimental related features
@interface BBExperimentalConfiguration : NSObject

/// Enables BBXHR plugin for network connections originating from a webview
@property (assign, nonatomic) BOOL BBXHR;

/// Custom extensions to experimental properties
- (BOOL)custom:(NSString*)key;

@end
