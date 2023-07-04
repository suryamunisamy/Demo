#!/bin/sh
set -e
set -u
set -o pipefail

function on_error {
  echo "$(realpath -mq "${0}"):$1: error: Unexpected failure"
}
trap 'on_error $LINENO' ERR

if [ -z ${FRAMEWORKS_FOLDER_PATH+x} ]; then
  # If FRAMEWORKS_FOLDER_PATH is not set, then there's nowhere for us to copy
  # frameworks to, so exit 0 (signalling the script phase was successful).
  exit 0
fi

echo "mkdir -p ${CONFIGURATION_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
mkdir -p "${CONFIGURATION_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"

COCOAPODS_PARALLEL_CODE_SIGN="${COCOAPODS_PARALLEL_CODE_SIGN:-false}"
SWIFT_STDLIB_PATH="${DT_TOOLCHAIN_DIR}/usr/lib/swift/${PLATFORM_NAME}"
BCSYMBOLMAP_DIR="BCSymbolMaps"


# This protects against multiple targets copying the same framework dependency at the same time. The solution
# was originally proposed here: https://lists.samba.org/archive/rsync/2008-February/020158.html
RSYNC_PROTECT_TMP_FILES=(--filter "P .*.??????")

# Copies and strips a vendored framework
install_framework()
{
  if [ -r "${BUILT_PRODUCTS_DIR}/$1" ]; then
    local source="${BUILT_PRODUCTS_DIR}/$1"
  elif [ -r "${BUILT_PRODUCTS_DIR}/$(basename "$1")" ]; then
    local source="${BUILT_PRODUCTS_DIR}/$(basename "$1")"
  elif [ -r "$1" ]; then
    local source="$1"
  fi

  local destination="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"

  if [ -L "${source}" ]; then
    echo "Symlinked..."
    source="$(readlink "${source}")"
  fi

  if [ -d "${source}/${BCSYMBOLMAP_DIR}" ]; then
    # Locate and install any .bcsymbolmaps if present, and remove them from the .framework before the framework is copied
    find "${source}/${BCSYMBOLMAP_DIR}" -name "*.bcsymbolmap"|while read f; do
      echo "Installing $f"
      install_bcsymbolmap "$f" "$destination"
      rm "$f"
    done
    rmdir "${source}/${BCSYMBOLMAP_DIR}"
  fi

  # Use filter instead of exclude so missing patterns don't throw errors.
  echo "rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --links --filter \"- CVS/\" --filter \"- .svn/\" --filter \"- .git/\" --filter \"- .hg/\" --filter \"- Headers\" --filter \"- PrivateHeaders\" --filter \"- Modules\" \"${source}\" \"${destination}\""
  rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --links --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${source}" "${destination}"

  local basename
  basename="$(basename -s .framework "$1")"
  binary="${destination}/${basename}.framework/${basename}"

  if ! [ -r "$binary" ]; then
    binary="${destination}/${basename}"
  elif [ -L "${binary}" ]; then
    echo "Destination binary is symlinked..."
    dirname="$(dirname "${binary}")"
    binary="${dirname}/$(readlink "${binary}")"
  fi

  # Strip invalid architectures so "fat" simulator / device frameworks work on device
  if [[ "$(file "$binary")" == *"dynamically linked shared library"* ]]; then
    strip_invalid_archs "$binary"
  fi

  # Resign the code if required by the build settings to avoid unstable apps
  code_sign_if_enabled "${destination}/$(basename "$1")"

  # Embed linked Swift runtime libraries. No longer necessary as of Xcode 7.
  if [ "${XCODE_VERSION_MAJOR}" -lt 7 ]; then
    local swift_runtime_libs
    swift_runtime_libs=$(xcrun otool -LX "$binary" | grep --color=never @rpath/libswift | sed -E s/@rpath\\/\(.+dylib\).*/\\1/g | uniq -u)
    for lib in $swift_runtime_libs; do
      echo "rsync -auv \"${SWIFT_STDLIB_PATH}/${lib}\" \"${destination}\""
      rsync -auv "${SWIFT_STDLIB_PATH}/${lib}" "${destination}"
      code_sign_if_enabled "${destination}/${lib}"
    done
  fi
}
# Copies and strips a vendored dSYM
install_dsym() {
  local source="$1"
  warn_missing_arch=${2:-true}
  if [ -r "$source" ]; then
    # Copy the dSYM into the targets temp dir.
    echo "rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --filter \"- CVS/\" --filter \"- .svn/\" --filter \"- .git/\" --filter \"- .hg/\" --filter \"- Headers\" --filter \"- PrivateHeaders\" --filter \"- Modules\" \"${source}\" \"${DERIVED_FILES_DIR}\""
    rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${source}" "${DERIVED_FILES_DIR}"

    local basename
    basename="$(basename -s .dSYM "$source")"
    binary_name="$(ls "$source/Contents/Resources/DWARF")"
    binary="${DERIVED_FILES_DIR}/${basename}.dSYM/Contents/Resources/DWARF/${binary_name}"

    # Strip invalid architectures from the dSYM.
    if [[ "$(file "$binary")" == *"Mach-O "*"dSYM companion"* ]]; then
      strip_invalid_archs "$binary" "$warn_missing_arch"
    fi
    if [[ $STRIP_BINARY_RETVAL == 0 ]]; then
      # Move the stripped file into its final destination.
      echo "rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --links --filter \"- CVS/\" --filter \"- .svn/\" --filter \"- .git/\" --filter \"- .hg/\" --filter \"- Headers\" --filter \"- PrivateHeaders\" --filter \"- Modules\" \"${DERIVED_FILES_DIR}/${basename}.framework.dSYM\" \"${DWARF_DSYM_FOLDER_PATH}\""
      rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --links --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${DERIVED_FILES_DIR}/${basename}.dSYM" "${DWARF_DSYM_FOLDER_PATH}"
    else
      # The dSYM was not stripped at all, in this case touch a fake folder so the input/output paths from Xcode do not reexecute this script because the file is missing.
      mkdir -p "${DWARF_DSYM_FOLDER_PATH}"
      touch "${DWARF_DSYM_FOLDER_PATH}/${basename}.dSYM"
    fi
  fi
}

# Used as a return value for each invocation of `strip_invalid_archs` function.
STRIP_BINARY_RETVAL=0

# Strip invalid architectures
strip_invalid_archs() {
  binary="$1"
  warn_missing_arch=${2:-true}
  # Get architectures for current target binary
  binary_archs="$(lipo -info "$binary" | rev | cut -d ':' -f1 | awk '{$1=$1;print}' | rev)"
  # Intersect them with the architectures we are building for
  intersected_archs="$(echo ${ARCHS[@]} ${binary_archs[@]} | tr ' ' '\n' | sort | uniq -d)"
  # If there are no archs supported by this binary then warn the user
  if [[ -z "$intersected_archs" ]]; then
    if [[ "$warn_missing_arch" == "true" ]]; then
      echo "warning: [CP] Vendored binary '$binary' contains architectures ($binary_archs) none of which match the current build architectures ($ARCHS)."
    fi
    STRIP_BINARY_RETVAL=1
    return
  fi
  stripped=""
  for arch in $binary_archs; do
    if ! [[ "${ARCHS}" == *"$arch"* ]]; then
      # Strip non-valid architectures in-place
      lipo -remove "$arch" -output "$binary" "$binary"
      stripped="$stripped $arch"
    fi
  done
  if [[ "$stripped" ]]; then
    echo "Stripped $binary of architectures:$stripped"
  fi
  STRIP_BINARY_RETVAL=0
}

# Copies the bcsymbolmap files of a vendored framework
install_bcsymbolmap() {
    local bcsymbolmap_path="$1"
    local destination="${BUILT_PRODUCTS_DIR}"
    echo "rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${bcsymbolmap_path}" "${destination}""
    rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${bcsymbolmap_path}" "${destination}"
}

# Signs a framework with the provided identity
code_sign_if_enabled() {
  if [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" -a "${CODE_SIGNING_REQUIRED:-}" != "NO" -a "${CODE_SIGNING_ALLOWED}" != "NO" ]; then
    # Use the current code_sign_identity
    echo "Code Signing $1 with Identity ${EXPANDED_CODE_SIGN_IDENTITY_NAME}"
    local code_sign_cmd="/usr/bin/codesign --force --sign ${EXPANDED_CODE_SIGN_IDENTITY} ${OTHER_CODE_SIGN_FLAGS:-} --preserve-metadata=identifier,entitlements '$1'"

    if [ "${COCOAPODS_PARALLEL_CODE_SIGN}" == "true" ]; then
      code_sign_cmd="$code_sign_cmd &"
    fi
    echo "$code_sign_cmd"
    eval "$code_sign_cmd"
  fi
}

if [[ "$CONFIGURATION" == "Debug" ]]; then
  install_framework "${BUILT_PRODUCTS_DIR}/AppAuth/AppAuth.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/Differentiator/Differentiator.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/PureLayout/PureLayout.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/Resolver/Resolver.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxAnimated/RxAnimated.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxCocoa/RxCocoa.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxDataSources/RxDataSources.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxRelay/RxRelay.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxSwift/RxSwift.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/SnapKit/SnapKit.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/UIScrollView-InfiniteScroll/UIScrollView_InfiniteScroll.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/VGParallaxHeader/VGParallaxHeader.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/lottie-ios/Lottie.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/AccessControlClient2/AccessControlClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/AccountStatementsClient2/AccountStatementsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ActionsClient2/ActionsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ArrangementsClient2/ArrangementsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/Backbase/Backbase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseAnimation/BackbaseAnimation.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseAppUpdater/BackbaseAppUpdater.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseAppUpdaterUseCase/BackbaseAppUpdaterUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseDesignSystem/BackbaseDesignSystem.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseIdentity/BackbaseIdentity.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseLottieAnimation/BackbaseLottieAnimation.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseObservability/BackbaseObservability.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseRemoteConfig/RemoteConfig.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseSDKSwiftWrapper/BackbaseSDKSwiftWrapper.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessDesign/BusinessDesign.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessJourneyCommon/BusinessJourneyCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessWorkspacesJourney/BusinessWorkspacesJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessWorkspacesJourneyWorkspacesUseCase2/BusinessWorkspacesJourneyWorkspacesUseCase2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/CardsClient2/CardsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ClientCommon/ClientCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ContactsClient2/ContactsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ContentServicesClient1/ContentServicesClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/EngagementBannersTargetingUseCase/EngagementBannersTargetingUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/EngagementsClient1/EngagementsClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/FinancialInstitutionManagerClient1/FinancialInstitutionManagerClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/IdentityAuthenticationJourney/IdentityAuthenticationJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/IdentitySelfEnrollmentJourney/IdentitySelfEnrollmentJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/IncomeExpenseAnalyzerClient1/IncomeExpenseAnalyzerClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesClient4/MessagesClient4.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesClient5/MessagesClient5.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesJourney/MessagesJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesJourneyMessagesUseCase/MessagesJourneyMessagesUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MobileNotificationsCore/MobileNotificationsCore.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MobileNotificationsIdentity/MobileNotificationsIdentity.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MobileNotificationsPresentation/MobileNotificationsPresentation.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsClient2/NotificationsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsJourney/NotificationsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsJourneyNotificationSettingsUseCase/NotificationsJourneyNotificationSettingsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsJourneyNotificationsUseCase/NotificationsJourneyNotificationsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PaymentOrderA2AClient1/PaymentOrderA2AClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PaymentOrderClient2/PaymentOrderClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PlacesClient2/PlacesClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PocketsClient2/PocketsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PushTokenClient/PushTokenClient.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RemoteDepositCaptureClient2/RemoteDepositCaptureClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountStatementsJourney/RetailAccountStatementsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountStatementsJourneyAccountStatementsUseCase/RetailAccountStatementsJourneyAccountStatementsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsFinancialInstitutionsUseCase/RetailAccountsAndTransactionsFinancialInstitutionsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsJourney/RetailAccountsAndTransactionsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsJourneyAccountsUseCase/RetailAccountsAndTransactionsJourneyAccountsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsJourneyTransactionsUseCase/RetailAccountsAndTransactionsJourneyTransactionsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAppCommon/RetailAppCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailCardsManagementJourney/RetailCardsManagementJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailCardsManagementJourneyCardsUseCase/RetailCardsManagementJourneyCardsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailCardsManagementJourneyTravelNoticesUseCase/RetailCardsManagementJourneyTravelNoticesUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailContactsJourney/RetailContactsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailContactsJourneyUseCase/RetailContactsJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailDesign/RetailDesign.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFeatureFilterAccessControlEntitlementsUseCase/RetailFeatureFilterAccessControlEntitlementsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFeatureFilterUseCase/RetailFeatureFilterUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFinancialInsightsJourney/RetailFinancialInsightsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFinancialInsightsJourneyIncomeExpenseAnalyzerUseCase/RetailFinancialInsightsJourneyIncomeExpenseAnalyzerUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailJourneyCommon/RetailJourneyCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailLocaleSelectorJourney/RetailLocaleSelectorJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailLocaleSelectorJourneyPersistentUseCase/RetailLocaleSelectorJourneyPersistentUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailMoreJourney/RetailMoreJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPaymentJourney/RetailPaymentJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPlacesJourney/RetailPlacesJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPlacesJourneyUseCase/RetailPlacesJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourney/RetailPocketsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourneyArrangementsUseCase/RetailPocketsJourneyArrangementsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourneyPaymentsUseCase/RetailPocketsJourneyPaymentsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourneyPocketsUseCase/RetailPocketsJourneyPocketsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositCaptureJourney/RetailRemoteDepositCaptureJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositCaptureJourneyUseCase/RetailRemoteDepositCaptureJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositHistoryJourney/RetailRemoteDepositHistoryJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositHistoryJourneyUseCase/RetailRemoteDepositHistoryJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUSApp/RetailUSApp.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUpcomingPaymentsJourney/RetailUpcomingPaymentsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUpcomingPaymentsJourneyUseCase/RetailUpcomingPaymentsJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUserContextSelectorJourney/RetailUserContextSelectorJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUserContextSelectorJourneyAccessControlUseCase/RetailUserContextSelectorJourneyAccessControlUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/TargetingClient1/TargetingClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/TransactionsClient2/TransactionsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/UserManagerClient2/UserManagerClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/UserManagerUserProfileUseCase/UserManagerUserProfileUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/UserProfileJourney/UserProfileJourney.framework"
fi
if [[ "$CONFIGURATION" == "Release" ]]; then
  install_framework "${BUILT_PRODUCTS_DIR}/AppAuth/AppAuth.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/Differentiator/Differentiator.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/PureLayout/PureLayout.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/Resolver/Resolver.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxAnimated/RxAnimated.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxCocoa/RxCocoa.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxDataSources/RxDataSources.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxRelay/RxRelay.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/RxSwift/RxSwift.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/SnapKit/SnapKit.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/UIScrollView-InfiniteScroll/UIScrollView_InfiniteScroll.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/VGParallaxHeader/VGParallaxHeader.framework"
  install_framework "${BUILT_PRODUCTS_DIR}/lottie-ios/Lottie.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/AccessControlClient2/AccessControlClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/AccountStatementsClient2/AccountStatementsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ActionsClient2/ActionsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ArrangementsClient2/ArrangementsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/Backbase/Backbase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseAnimation/BackbaseAnimation.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseAppUpdater/BackbaseAppUpdater.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseAppUpdaterUseCase/BackbaseAppUpdaterUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseDesignSystem/BackbaseDesignSystem.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseIdentity/BackbaseIdentity.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseLottieAnimation/BackbaseLottieAnimation.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseObservability/BackbaseObservability.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseRemoteConfig/RemoteConfig.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BackbaseSDKSwiftWrapper/BackbaseSDKSwiftWrapper.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessDesign/BusinessDesign.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessJourneyCommon/BusinessJourneyCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessWorkspacesJourney/BusinessWorkspacesJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/BusinessWorkspacesJourneyWorkspacesUseCase2/BusinessWorkspacesJourneyWorkspacesUseCase2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/CardsClient2/CardsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ClientCommon/ClientCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ContactsClient2/ContactsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/ContentServicesClient1/ContentServicesClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/EngagementBannersTargetingUseCase/EngagementBannersTargetingUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/EngagementsClient1/EngagementsClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/FinancialInstitutionManagerClient1/FinancialInstitutionManagerClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/IdentityAuthenticationJourney/IdentityAuthenticationJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/IdentitySelfEnrollmentJourney/IdentitySelfEnrollmentJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/IncomeExpenseAnalyzerClient1/IncomeExpenseAnalyzerClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesClient4/MessagesClient4.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesClient5/MessagesClient5.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesJourney/MessagesJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MessagesJourneyMessagesUseCase/MessagesJourneyMessagesUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MobileNotificationsCore/MobileNotificationsCore.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MobileNotificationsIdentity/MobileNotificationsIdentity.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/MobileNotificationsPresentation/MobileNotificationsPresentation.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsClient2/NotificationsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsJourney/NotificationsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsJourneyNotificationSettingsUseCase/NotificationsJourneyNotificationSettingsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/NotificationsJourneyNotificationsUseCase/NotificationsJourneyNotificationsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PaymentOrderA2AClient1/PaymentOrderA2AClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PaymentOrderClient2/PaymentOrderClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PlacesClient2/PlacesClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PocketsClient2/PocketsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/PushTokenClient/PushTokenClient.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RemoteDepositCaptureClient2/RemoteDepositCaptureClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountStatementsJourney/RetailAccountStatementsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountStatementsJourneyAccountStatementsUseCase/RetailAccountStatementsJourneyAccountStatementsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsFinancialInstitutionsUseCase/RetailAccountsAndTransactionsFinancialInstitutionsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsJourney/RetailAccountsAndTransactionsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsJourneyAccountsUseCase/RetailAccountsAndTransactionsJourneyAccountsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAccountsAndTransactionsJourneyTransactionsUseCase/RetailAccountsAndTransactionsJourneyTransactionsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailAppCommon/RetailAppCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailCardsManagementJourney/RetailCardsManagementJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailCardsManagementJourneyCardsUseCase/RetailCardsManagementJourneyCardsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailCardsManagementJourneyTravelNoticesUseCase/RetailCardsManagementJourneyTravelNoticesUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailContactsJourney/RetailContactsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailContactsJourneyUseCase/RetailContactsJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailDesign/RetailDesign.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFeatureFilterAccessControlEntitlementsUseCase/RetailFeatureFilterAccessControlEntitlementsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFeatureFilterUseCase/RetailFeatureFilterUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFinancialInsightsJourney/RetailFinancialInsightsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailFinancialInsightsJourneyIncomeExpenseAnalyzerUseCase/RetailFinancialInsightsJourneyIncomeExpenseAnalyzerUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailJourneyCommon/RetailJourneyCommon.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailLocaleSelectorJourney/RetailLocaleSelectorJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailLocaleSelectorJourneyPersistentUseCase/RetailLocaleSelectorJourneyPersistentUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailMoreJourney/RetailMoreJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPaymentJourney/RetailPaymentJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPlacesJourney/RetailPlacesJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPlacesJourneyUseCase/RetailPlacesJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourney/RetailPocketsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourneyArrangementsUseCase/RetailPocketsJourneyArrangementsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourneyPaymentsUseCase/RetailPocketsJourneyPaymentsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailPocketsJourneyPocketsUseCase/RetailPocketsJourneyPocketsUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositCaptureJourney/RetailRemoteDepositCaptureJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositCaptureJourneyUseCase/RetailRemoteDepositCaptureJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositHistoryJourney/RetailRemoteDepositHistoryJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailRemoteDepositHistoryJourneyUseCase/RetailRemoteDepositHistoryJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUSApp/RetailUSApp.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUpcomingPaymentsJourney/RetailUpcomingPaymentsJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUpcomingPaymentsJourneyUseCase/RetailUpcomingPaymentsJourneyUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUserContextSelectorJourney/RetailUserContextSelectorJourney.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/RetailUserContextSelectorJourneyAccessControlUseCase/RetailUserContextSelectorJourneyAccessControlUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/TargetingClient1/TargetingClient1.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/TransactionsClient2/TransactionsClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/UserManagerClient2/UserManagerClient2.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/UserManagerUserProfileUseCase/UserManagerUserProfileUseCase.framework"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/UserProfileJourney/UserProfileJourney.framework"
fi
if [ "${COCOAPODS_PARALLEL_CODE_SIGN}" == "true" ]; then
  wait
fi
