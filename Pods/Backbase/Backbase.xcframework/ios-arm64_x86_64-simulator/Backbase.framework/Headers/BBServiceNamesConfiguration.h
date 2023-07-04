//
//  BBServiceNamesConfiguration.h
//  Backbase
//
//  Created by Gabor Detari on 8/11/20.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

@interface BBServiceNamesConfiguration : NSObject

/// Name of version management endpoint, default: "versionmanagement-persistence-service"
@property (strong, nonatomic) NSString* versionManagement;

/// Name of portal endpoint, default: "portals"
@property (strong, nonatomic) NSString* portal;

/// Name of targeting endpoint, default: "targeting"
@property (strong, nonatomic) NSString* targeting;

/// Name of content endpoint, default: "contentservices"
@property (strong, nonatomic) NSString* content;

@end
