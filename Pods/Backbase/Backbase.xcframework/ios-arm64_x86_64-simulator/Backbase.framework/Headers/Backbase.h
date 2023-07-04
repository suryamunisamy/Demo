//
//  Backbase.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 19/02/15.
//

#import <UIKit/UIKit.h>

//! Project version number for Backbase.
FOUNDATION_EXPORT double BackbaseVersionNumber;

//! Project version string for Backbase.
FOUNDATION_EXPORT const unsigned char BackbaseVersionString[];

// exposed interfaces.
//#import <BBCore/BBCore.h>
//#import <BBSecurity/BBSecurity.h>

#import <Backbase/BBCore.h>
#import <Backbase/BBSecurity.h>

// global public constants
#import <Backbase/BBConstants.h>

// rendering package
#import <Backbase/Renderable.h>
#import <Backbase/Renderer.h>
#import <Backbase/WebRenderer.h>
#import <Backbase/RendererDelegate.h>
#import <Backbase/BBRendererFactory.h>
#import <Backbase/NativeView.h>
#import <Backbase/NativeContract.h>
#import <Backbase/NativeRenderer.h>
#import <Backbase/PageRenderer.h>
#import <Backbase/UniformPageRenderer.h>
#import <Backbase/PageRendererView.h>
#import <Backbase/TargetingRenderer.h>
#import <Backbase/TargetingRendererContract.h>
#import <Backbase/TargetingRendererView.h>

// model package
#import <Backbase/SiteMapItemChild.h>
#import <Backbase/Model.h>
#import <Backbase/ModelDelegate.h>
#import <Backbase/StatusCheckerDelegate.h>

// plugins package
#import <Backbase/Plugin.h>
#import <Backbase/BBStorage.h>
#import <Backbase/StorageComponent.h>
#import <Backbase/AbstractStorageComponent.h>
#import <Backbase/PersistentStorage.h>
#import <Backbase/PersistentStorageComponent.h>
#import <Backbase/InMemoryStorage.h>
#import <Backbase/InMemoryStorageComponent.h>
#import <Backbase/EncryptedStorage.h>
#import <Backbase/EncryptedStorageComponent.h>
#import <Backbase/BiometricStorage.h>
#import <Backbase/BiometricStorageComponent.h>
#import <Backbase/DeviceInfo.h>
#import <Backbase/DeviceInfoComponent.h>

// security package
#import <Backbase/SecurityViolationDelegate.h>
#import <Backbase/LoginDelegate.h>
#import <Backbase/SessionDelegate.h>
//#import <Backbase/SecurityCertificateValidator.h>
//#import <Backbase/BBPublicKeyValidator.h>
//#import <Backbase/BBPKIUtils.h>

// networking package
#import <Backbase/ErrorResponseResolver.h>
#import <Backbase/BBChainErrorResponseResolver.h>
#import <Backbase/NSURLResponse+Challenges.h>

// content package
#import <Backbase/BBContentItem.h>

// targeting package
#import <Backbase/BBTargetingCallback.h>

// auth clients
#import <Backbase/BBCookieUtils.h>
#import <Backbase/AuthClientDelegate.h>
#import <Backbase/AuthClient.h>
#import <Backbase/PasswordAuthClientDelegate.h>
#import <Backbase/PasswordAuthClient.h>
#import <Backbase/BBAuthClient.h>
#import <Backbase/OAuth2AuthClientDelegate.h>
#import <Backbase/OAuth2ROPCGrant.h>
#import <Backbase/OAuth2AuthClient.h>
#import <Backbase/BBOAuth2AuthClient.h>
#import <Backbase/BBOAuth2InvalidAccessTokenResolver.h>
#import <Backbase/BBOAuth2InvalidRefreshTokenResolver.h>
#import <Backbase/BBAuthenticatorAggregator.h>

// DBS clients
#import <Backbase/DBSClient.h>
#import <Backbase/DBSDataProvider.h>
#import <Backbase/BBNetworkDataProvider.h>

// main module
#import <Backbase/Facade.h>

// Cipher
#import <Backbase/BBCipherUtils.h>
