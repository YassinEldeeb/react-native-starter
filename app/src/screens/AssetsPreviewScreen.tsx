import { TouchableOpacity } from '@gorhom/bottom-sheet'
import { differenceInDays, format, parseISO } from 'date-fns'
import * as Constants from 'expo-constants'
import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import {
  Button,
  Image as PureImage,
  ImageLoadEventData,
  NativeSyntheticEvent,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native'
import Gallery, { GalleryRef } from 'react-native-awesome-gallery'
import { Image } from 'react-native-expo-image-cache'
import { useQueryClient } from 'react-query'
import { v4 as uuidv4 } from 'uuid'
import { AppNavProps, HomeNavProps } from '../@types/NavProps'
import { useStoreState } from '../@types/typedHooks'
import { AlbumIcon } from '../components/icons/AlbumIcon'
import { ArrowIcon } from '../components/icons/Arrow'
import { DeleteIcon } from '../components/icons/DeleteIcon'
import { DownloadIcon } from '../components/icons/DownloadIcon'
import { ShareIcon } from '../components/icons/ShareIcon'
import { MyText } from '../components/MyText'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import shorthash from 'shorthash'
import { askingForFilesPermission } from '../utils/getFilesPermision'
import { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../@types/StackParamList'
import { updateAlbum } from '../api/updateAlbum'
import { AssetsGallery } from '../components/AssetsGallery'

interface downloadAsset {
  remoteUrl: string
  localUri: string
  mimetype: string
}

interface deleteAsset {
  assetId: string
  albumId: string
  mimetype: string
  navigation: StackNavigationProp<AppStackParamList, 'AssetsPreview'>
}

interface setAlbumCover {
  AlbumFileId: string
  albumId: string
}

const downloadAsset = async ({
  remoteUrl,
  mimetype,
  localUri,
}: downloadAsset) => {
  askingForFilesPermission()
  ToastAndroid.show('Progressing...', ToastAndroid.BOTTOM)
  const hashedUrl = shorthash.unique(remoteUrl)
  const ext = '.' + mimetype.replace('image/', '').replace('video/', '')
  const { exists } = await FileSystem.getInfoAsync(
    FileSystem.documentDirectory + hashedUrl + ext
  )
  const { exists: exists2 } = await FileSystem.getInfoAsync(localUri)

  if (exists || exists2) {
    return ToastAndroid.show('Image is already on device!', ToastAndroid.BOTTOM)
  }

  const downloadedImage = await FileSystem.downloadAsync(
    remoteUrl,
    FileSystem.documentDirectory + hashedUrl + ext
  )

  await MediaLibrary.saveToLibraryAsync(downloadedImage.uri)

  ToastAndroid.show('Saved Image!', ToastAndroid.BOTTOM)
}

const shareAsset = async ({ localUri, remoteUrl, mimetype }: downloadAsset) => {
  ToastAndroid.show('Progressing...', ToastAndroid.SHORT)
  const ext = '.' + mimetype.replace('image/', '').replace('video/', '')
  const { exists } = await FileSystem.getInfoAsync(localUri)

  let image: any
  if (!exists) {
    const hashedUrl = shorthash.unique(remoteUrl)
    const cacheUrl = FileSystem.cacheDirectory + hashedUrl + ext

    const cacheExists = await FileSystem.getInfoAsync(cacheUrl)

    if (cacheExists.exists) {
      image = cacheExists
    } else {
      const cachedImage = await FileSystem.downloadAsync(remoteUrl, cacheUrl)
      image = cachedImage
    }
  } else {
    image = { uri: localUri }
  }

  if (!(await Sharing.isAvailableAsync())) {
    alert(`Uh oh, sharing isn't available on your platform`)
    return
  }

  await Sharing.shareAsync(image.uri, {
    mimeType: mimetype,
    dialogTitle: 'Share Image',
  })
}

const deleteAsset = async ({
  assetId,
  albumId,
  navigation,
  mimetype,
}: deleteAsset) => {
  const assetType = mimetype.includes('video') ? 'video' : 'Image'

  navigation.navigate('ConfirmationModal', {
    title: `Are you sure you want to Delete this ${assetType}?`,
    actionType: 'deleteFiles',
    deleteId: JSON.stringify({ albumId, assetId }),
  })
}

const setAlbumCover = async ({ AlbumFileId, albumId }: setAlbumCover) => {
  ToastAndroid.show('Progressing...', ToastAndroid.SHORT)
  updateAlbum({ AlbumFileId }, albumId)
  ToastAndroid.show('Album Cover set Successfully', ToastAndroid.SHORT)
}

const options = [
  {
    id: uuidv4(),
    label: 'Share',
    icon: <ShareIcon size={22} />,
    action: shareAsset,
  },
  {
    id: uuidv4(),
    label: 'Album Cover',
    icon: <AlbumIcon size={22} />,
    action: setAlbumCover,
  },
  {
    id: uuidv4(),
    label: 'Delete',
    icon: <DeleteIcon size={22} />,
    action: deleteAsset,
  },
  {
    id: uuidv4(),
    label: 'Download',
    icon: <DownloadIcon size={22} />,
    action: downloadAsset,
  },
]

export const AssetsPreviewScreen = ({
  navigation,
  route: { params },
}: AppNavProps<'AssetsPreview'>) => {
  const [assetHeadersShown, setAssetHeadersShown] = useState(true)
  const queryClient = useQueryClient()
  const assets = (
    queryClient.getQueryData(`albumFiles:${params.albumId}`) as any[]
  ).filter((asset) => {
    return asset.fileURL !== 'empty' && !asset?.placeholder
  })

  const colors = useStoreState((state) => state.theme)

  const [currentIndex, setCurrentIndex] = useState(params.index - 1)

  const getDate = () => {
    const diffInDays = differenceInDays(
      new Date(),
      parseISO(assets[currentIndex].createdAt)
    )
    switch (diffInDays) {
      case 0:
        return 'Today'
      case 1:
        return 'Yesterday'
      default:
        return format(parseISO(assets[currentIndex].createdAt), 'MMMM d, yyyy')
    }
  }
  const [videoStatus, setVideoStatus] = useState<{ isPlaying: boolean }>({})
  const videoRef = useRef(null)
  console.log(videoStatus)
  return (
    <View style={styles.container}>
      {assetHeadersShown && (
        <View style={[styles.topHeader, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={styles.arrowParent}
            onPress={() => navigation.goBack()}
          >
            <ArrowIcon width={21} />
          </TouchableOpacity>
          <View style={styles.date}>
            <MyText
              size='sm'
              customStyles={{
                transform: [{ translateY: 2 }],
              }}
            >
              {getDate()}
            </MyText>
            <MyText
              customStyles={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 13,
                transform: [{ translateY: -2 }],
              }}
            >
              {format(parseISO(assets[currentIndex].createdAt), 'p')}
            </MyText>
          </View>
        </View>
      )}
      {assetHeadersShown && (
        <View
          style={[
            styles.topHeader,
            styles.bottomHeader,
            { backgroundColor: colors.secondary },
          ]}
        >
          <Button
            title={videoStatus.isPlaying ? 'Pause' : 'Play'}
            onPress={() =>
              videoStatus.isPlaying
                ? videoRef.current?.pauseAsync()
                : videoRef.current?.playAsync()
            }
          />
          {options.map((e) => (
            <TouchableOpacity
              onPress={() => {
                if (
                  e.action &&
                  (e.label === 'Share' || e.label === 'Download')
                ) {
                  e.action({
                    remoteUrl: assets[currentIndex].fileURL,
                    localUri: assets[currentIndex].deviceFileUrl,
                    mimetype: assets[currentIndex].mimetype,
                  } as any)
                } else if (e.label === 'Delete') {
                  e.action({
                    mimetype: assets[currentIndex].mimetype,
                    albumId: params.albumId,
                    assetId: assets[currentIndex].id,
                    navigation,
                  } as any)
                } else if (e.label === 'Album Cover') {
                  e.action({
                    albumId: params.albumId,
                    AlbumFileId: assets[currentIndex].id,
                  } as any)
                }
              }}
              key={e.id}
              activeOpacity={colors.activeOpacity}
              style={styles.optionParent}
            >
              {e.icon}
              <MyText
                size='2xs'
                customStyles={{ paddingTop: 1.5, opacity: 0.8 }}
              >
                {e.label}
              </MyText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <AssetsGallery
        setVideoStatus={setVideoStatus}
        videoRef={videoRef}
        params={params}
        setAssetHeadersShown={setAssetHeadersShown}
        setCurrentIndex={setCurrentIndex}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    position: 'absolute',
    zIndex: 100,
    top: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingLeft: 15,
    paddingTop: 8 + Constants.default.statusBarHeight,
  },
  bottomHeader: {
    paddingVertical: 4,
    paddingBottom: 6,
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingLeft: 20,
    bottom: 0,
    top: undefined,
    justifyContent: 'space-between',
  },
  date: {
    paddingLeft: 2,
  },
  arrowParent: {
    padding: 10,
    paddingLeft: 5,
  },

  optionParent: {
    alignItems: 'center',
    padding: 10,
  },
})